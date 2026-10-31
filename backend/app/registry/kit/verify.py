#!/usr/bin/env python3
"""Check a Provenance registration yourself. Standard library only: no install, no trust in our servers.

    python verify.py                      # check the record, its proof, and the Bitcoin block
    python verify.py my-artwork.jpg       # ...and that this file is the exact one that was registered
    python verify.py --offline            # skip the block-explorer lookup

What each check means:
  1. record.json hashes to the registry entry hash in chain.json, so the record is unaltered.
  2. Your file's SHA-256 equals the record's file_sha256, so this exact file was registered.
  3. record.json.ots (OpenTimestamps) commits to that same hash.
  4. Replaying the proof gives a Bitcoin block's merkle root, checked against a public block explorer.
     The block's time is the latest moment the record could have been created.
"""
import hashlib
import json
import sys
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).resolve().parent
EXPLORER = "https://blockstream.info/api"
OTS_MAGIC = b"\x00OpenTimestamps\x00\x00Proof\x00\xbf\x89\xe2\xe8\x84\xe8\x92\x94"
BITCOIN_TAG = bytes.fromhex("0588960d73d71901")
PENDING_TAG = bytes.fromhex("83dfe30d2ef90c8e")


class Reader:
    def __init__(self, data: bytes):
        self.data, self.pos = data, 0

    def bytes(self, n: int) -> bytes:
        if self.pos + n > len(self.data):
            raise ValueError("proof file is truncated")
        out = self.data[self.pos:self.pos + n]
        self.pos += n
        return out

    def varuint(self) -> int:
        value, shift = 0, 0
        while True:
            b = self.bytes(1)[0]
            value |= (b & 0x7F) << shift
            if not b & 0x80:
                return value
            shift += 7

    def varbytes(self) -> bytes:
        return self.bytes(self.varuint())


UNARY = {
    0x08: lambda m: hashlib.sha256(m).digest(),
    0x02: lambda m: hashlib.sha1(m).digest(),
    0xF2: lambda m: m[::-1],
    0xF3: lambda m: m.hex().encode(),
}
BINARY = {0xF0: lambda m, a: m + a, 0xF1: lambda m, a: a + m}


def walk(r: Reader, msg: bytes, found: list, depth: int = 0) -> None:
    """Replay one timestamp (sub)tree, collecting (kind, value, msg) attestations."""
    if depth > 256:
        raise ValueError("proof is nested too deeply")

    def one(tag: int) -> None:
        if tag == 0x00:
            att_tag, payload = r.bytes(8), Reader(r.varbytes())
            if att_tag == BITCOIN_TAG:
                found.append(("bitcoin", payload.varuint(), msg))
            elif att_tag == PENDING_TAG:
                found.append(("pending", payload.varbytes().decode("utf-8", "replace"), msg))
        elif tag in UNARY:
            walk(r, UNARY[tag](msg), found, depth + 1)
        elif tag in BINARY:
            walk(r, BINARY[tag](msg, r.varbytes()), found, depth + 1)
        else:
            raise ValueError(f"unsupported proof operation 0x{tag:02x}")

    tag = r.bytes(1)[0]
    while tag == 0xFF:  # fork: several branches from the same message
        one(r.bytes(1)[0])
        tag = r.bytes(1)[0]
    one(tag)


def read_proof(path: Path) -> tuple:
    r = Reader(path.read_bytes())
    if r.bytes(len(OTS_MAGIC)) != OTS_MAGIC:
        raise ValueError("not an OpenTimestamps proof")
    if r.varuint() != 1:
        raise ValueError("unsupported proof version")
    if r.bytes(1)[0] != 0x08:
        raise ValueError("proof does not use SHA-256 for the file")
    digest = r.bytes(32)
    found: list = []
    walk(r, digest, found)
    return digest, found


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "provenance-verify"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def main(argv: list) -> int:
    offline = "--offline" in argv
    files = [a for a in argv if not a.startswith("--")]
    ok = True

    def report(passed: bool, text: str) -> None:
        nonlocal ok
        ok = ok and passed
        print(("  PASS  " if passed else "  FAIL  ") + text)

    record_bytes = (HERE / "record.json").read_bytes()
    record = json.loads(record_bytes)
    chain = json.loads((HERE / "chain.json").read_text())
    record_hash = hashlib.sha256(record_bytes).hexdigest()
    print(f"Registration {record['id']}: \"{record['title']}\" by {record['owner_name']}, recorded {record['created_at']}\n")

    report(record_hash == chain["entry_hash"], f"record.json hashes to the registry entry hash {record_hash[:16]}...")
    report(record.get("prev_hash") == chain["prev_hash"], "record links to the previous registry entry")

    if files:
        expected = record.get("file_sha256")
        actual = hashlib.sha256(Path(files[0]).read_bytes()).hexdigest()
        if expected:
            report(actual == expected, f"{files[0]} is the exact file that was registered")
        else:
            print("  INFO  this record predates file hashes; only the image fingerprints were registered")

    proof = HERE / "record.json.ots"
    if not proof.exists():
        print("  INFO  no timestamp proof yet (it is created a moment after registration)")
        return 0 if ok else 1
    try:
        digest, found = read_proof(proof)
    except ValueError as e:
        report(False, f"record.json.ots could not be read: {e}")
        return 1
    report(digest.hex() == record_hash, "record.json.ots timestamps this exact record")

    blocks = sorted((v, m) for kind, v, m in found if kind == "bitcoin")
    if not blocks:
        calendars = sorted({v for kind, v, _ in found if kind == "pending"})
        print("  INFO  waiting for Bitcoin: the calendar(s) " + ", ".join(calendars) + " have the record;")
        print("        Bitcoin confirmation takes a few hours. Download a fresh kit later.")
        return 0 if ok else 1

    height, msg = blocks[0]
    merkle = msg[::-1].hex()
    if offline:
        print(f"  INFO  proof ends in Bitcoin block {height}, merkle root {merkle} (not checked: --offline)")
        return 0 if ok else 1
    try:
        block_hash = get(f"{EXPLORER}/block-height/{height}").decode().strip()
        block = json.loads(get(f"{EXPLORER}/block/{block_hash}"))
    except Exception as e:  # noqa: BLE001 - report, don't crash
        print(f"  INFO  could not reach {EXPLORER} ({e}); proof ends in block {height}, merkle root {merkle}")
        return 0 if ok else 1
    when = datetime.fromtimestamp(block["timestamp"], timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    report(block["merkle_root"] == merkle, f"Bitcoin block {height} (mined {when}) contains this record's proof")
    print(f"\n{'All checks passed.' if ok else 'Some checks FAILED.'} The record existed no later than {when}.")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
