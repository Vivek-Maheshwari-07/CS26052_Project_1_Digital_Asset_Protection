import React from 'react';
import { CheckCircle2, ShieldCheck, Cpu } from 'lucide-react';

const RECENT_LOGS = [
  {
    hash: '0x7f83a91e4b2190c7e29a31fa8',
    type: 'C2PA Hardware Manifest',
    date: 'Aug 14, 2026',
    status: 'Verified'
  },
  {
    hash: '0x3c990b712fae8412091176b',
    type: 'SHA-256 Ledger Watermark',
    date: 'Aug 12, 2026',
    status: 'Verified'
  },
  {
    hash: '0x9a1024bc68310e9f1a28290',
    type: 'Cryptographic Signature',
    date: 'Aug 10, 2026',
    status: 'Verified'
  },
  {
    hash: '0xe5d81029c7162fa9318b704',
    type: 'Camera Raw Seal',
    date: 'Aug 08, 2026',
    status: 'Verified'
  }
];

const ActivityLog = () => {
  return (
    <div className="space-y-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#666666] font-medium">System Status</p>
            <p className="text-base font-bold text-[#111111] mt-0.5">Online & Active</p>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#666666] font-medium">Verified Assets</p>
            <p className="text-base font-bold text-[#111111] mt-0.5">1,248 Hashes</p>
          </div>
          <ShieldCheck className="w-5 h-5 text-blue-600" />
        </div>

        <div className="bg-white border border-[#E5E5E5] rounded-lg p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-[#666666] font-medium">C2PA Protocol</p>
            <p className="text-base font-bold text-[#111111] mt-0.5">Standard v1.4</p>
          </div>
          <Cpu className="w-5 h-5 text-gray-700" />
        </div>
      </div>

      {/* Clean Provenance Log Table */}
      <div className="bg-white border border-[#E5E5E5] rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5E5] bg-gray-50 flex items-center justify-between">
          <span className="text-xs font-bold text-[#111111] uppercase tracking-wider">
            Recent Provenance Logs
          </span>
          <span className="text-xs text-[#666666]">Real-time Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-[#E5E5E5] bg-white text-[#666666]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Cryptographic Hash</th>
                <th className="px-4 py-2.5 font-semibold">Credential Type</th>
                <th className="px-4 py-2.5 font-semibold">Date</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E5E5]">
              {RECENT_LOGS.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[#111111]">{item.hash}</td>
                  <td className="px-4 py-3 text-[#111111]">{item.type}</td>
                  <td className="px-4 py-3 text-[#666666]">{item.date}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ActivityLog;
