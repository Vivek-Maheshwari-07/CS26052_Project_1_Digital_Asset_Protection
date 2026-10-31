Provenance verification kit
===========================

This folder lets anyone check a registration without trusting Provenance's servers.

  record.json        The registry record, byte for byte. Its SHA-256 is the registry entry hash.
  record.json.ots    OpenTimestamps proof that the record existed at a point in time (Bitcoin-backed).
  chain.json         Where the record sits in the registry's hash chain, when this kit was made.
  verify.py          Checks all of the above. Python 3 standard library only.

Run it:

  python verify.py                    record, proof and Bitcoin block
  python verify.py your-original.jpg  ...and that this exact file is the one that was registered

What it proves, and what it does not:

  - It proves the record (title, owner name, image fingerprints and, for newer records, the exact
    file's SHA-256) existed no later than the time of the Bitcoin block it reports.
  - It does not by itself prove who created the image; it proves who registered it, and when.

Independent cross-check with the official OpenTimestamps client (it may ask for a local
Bitcoin node to check the block itself):

  pip install opentimestamps-client
  ots verify record.json.ots -f record.json
