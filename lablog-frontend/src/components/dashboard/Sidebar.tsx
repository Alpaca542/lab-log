import { PiHeartbeatLight, PiClipboardTextLight, PiFlaskLight } from "react-icons/pi";
import type { ScheduleItem, DashboardRow } from "./types";
import TabButton from "./TabButton.tsx";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (t: string) => void;
  categoryKeys: string[];
  schedule: ScheduleItem[];
  data: DashboardRow[];
  rangeSeverity: (v: string, r?: string)=>"in"|"slight"|"far";
}

export default function Sidebar({ activeTab, setActiveTab, categoryKeys, schedule, data, rangeSeverity }: SidebarProps) {
  const totalTests = data.length;
  const latestOutCount = data.reduce((acc,r)=> rangeSeverity(r.value, r.reference_range)==="in"?acc:acc+1,0);
  return (
    <aside className="w-56 shrink-0 pr-4 border-r border-slate-200">
      <div className="mb-5 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 text-[11px] text-slate-600 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-slate-800 font-medium"><PiHeartbeatLight className="w-4 h-4 text-blue-600" /> Summary</div>
          <div className="flex items-center justify-between"><span>Total</span><span className="font-semibold text-slate-700">{totalTests}</span></div>
          <div className="flex items-center justify-between"><span>Potential OOR</span><span className="font-semibold text-rose-600">{latestOutCount}</span></div>
          <div className="flex items-center justify-between"><span>Scheduled</span><span className="font-semibold text-blue-600">{schedule.length}</span></div>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <TabButton label="Main" icon={<PiClipboardTextLight className="w-4 h-4" />} active={activeTab==="main"} onClick={()=>setActiveTab("main")} />
        {categoryKeys.map(cat => (
          <TabButton key={cat} label={cat} icon={<PiFlaskLight className="w-4 h-4" />} active={activeTab===cat} onClick={()=>setActiveTab(cat)} />
        ))}
      </div>
    </aside>
  );
}