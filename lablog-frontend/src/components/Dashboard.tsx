import { useMemo, useState, useEffect } from "react";
import supabase from "../supabase";
import type { DashboardRow, ScheduleItem } from "./dashboard/types";
import { rangeSeverity, isSteepTrend } from "./dashboard/utils";
import Sidebar from "./dashboard/Sidebar.tsx";
import MainOverview from "./dashboard/MainOverview.tsx";
import CategoryPanel from "./dashboard/CategoryPanel.tsx";
import SearchPanel from "./dashboard/SearchPanel.tsx";

interface DashboardProps {
    data: DashboardRow[];
    userId?: string;
}

function parseNumeric(v: string): number | null {
    const num = parseFloat((v || "").replace(/[^0-9.+-]/g, ""));
    return isFinite(num) ? num : null;
}

export default function Dashboard({ data, userId }: DashboardProps) {
    const categories = useMemo(() => {
        const map: Record<string, DashboardRow[]> = {};
        data.forEach((d) => {
            const cat = (d.category || "uncategorized").toLowerCase();
            let numeric = parseNumeric(d.value || "");
            const unitLower = (d.unit || "").toLowerCase();
            if (!d.unit || unitLower === "qualitative" || numeric == null)
                numeric = null;
            if (!map[cat]) map[cat] = [];
            map[cat].push({ ...d, numeric });
        });
        Object.values(map).forEach((arr) =>
            arr.sort(
                (a, b) =>
                    new Date(
                        a.test_date || a.dateAdded || a.created_at || 0
                    ).getTime() -
                    new Date(
                        b.test_date || b.dateAdded || b.created_at || 0
                    ).getTime()
            )
        );
        return map;
    }, [data]);
    const categoryKeys = Object.keys(categories).sort();
    const [activeTab, setActiveTab] = useState<string>("main");

    // Schedule state
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [scheduleLoaded, setScheduleLoaded] = useState(false);

    useEffect(() => {
        // load schedule
        const load = async () => {
            if (!userId) return;
            setScheduleLoading(true);
            setScheduleError(null);
            try {
                const { data: rows, error } = await supabase
                    .from("lab_schedule")
                    .select("id,test_name,category,reason,status,doctor")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                const mapped = (rows || []).map((r: any) => ({
                    id: r.id,
                    test_name: r.test_name,
                    category: r.category,
                    reason: r.reason,
                    status: r.status,
                    doctor: r.doctor || null,
                }));
                const seen: Record<string, boolean> = {};
                const dedup = mapped.filter((m: any) => {
                    const k = m.test_name.toLowerCase();
                    if (seen[k]) return false;
                    seen[k] = true;
                    return true;
                });
                setSchedule(dedup);
            } catch (e: any) {
                setScheduleError(e.message || "Failed loading schedule");
            } finally {
                setScheduleLoading(false);
                setScheduleLoaded(true);
            }
        };
        load();
    }, [userId]);

    const normalizeReason = (r: any): ScheduleItem["reason"] => {
        if (r === "out_of_range" || r === "trend" || r === "manual") return r;
        const lower = String(r || "").toLowerCase();
        if (lower.includes("out") && lower.includes("range"))
            return "out_of_range";
        if (lower.includes("trend")) return "trend";
        return "manual";
    };

    const addSchedule = async (item: Omit<ScheduleItem, "status">) => {
        item = { ...item, reason: normalizeReason(item.reason) } as any;
        const exists = schedule.some(
            (p) => p.test_name.toLowerCase() === item.test_name.toLowerCase()
        );
        if (exists || !userId) return;
        const newItem: ScheduleItem & { id?: number } = {
            ...item,
            status: "pending",
        };
        setSchedule((prev) => [newItem, ...prev]);
        try {
            const { error, data: inserted } = await supabase
                .from("lab_schedule")
                .insert({
                    user_id: userId,
                    test_name: item.test_name,
                    category: item.category,
                    reason: item.reason,
                    doctor: (item as any).doctor || null,
                    status: "pending",
                })
                .select("id");
            if (error) throw error;
            if (inserted && inserted[0])
                setSchedule((prev) =>
                    prev.map((p) =>
                        p === newItem ? { ...newItem, id: inserted[0].id } : p
                    )
                );
        } catch (e: any) {
            setSchedule((prev) => prev.filter((p) => p !== newItem));
            setScheduleError(
                e?.message || "Failed creating schedule item (reason invalid?)"
            );
        }
    };
    const markScheduleComplete = async (name: string) => {
        setSchedule((prev) =>
            prev.map((p) =>
                p.test_name.toLowerCase() === name.toLowerCase()
                    ? {
                          ...p,
                          status: p.status === "pending" ? "done" : "pending",
                      }
                    : p
            )
        );
        const target = schedule.find(
            (p) => p.test_name.toLowerCase() === name.toLowerCase()
        );
        if (!target || !userId) return;
        const newStatus = target.status === "pending" ? "done" : "pending";
        try {
            if ((target as any).id) {
                await supabase
                    .from("lab_schedule")
                    .update({ status: newStatus })
                    .eq("id", (target as any).id)
                    .eq("user_id", userId);
            }
        } catch {}
    };
    const removeSchedule = async (name: string) => {
        const target = schedule.find(
            (p) => p.test_name.toLowerCase() === name.toLowerCase()
        );
        setSchedule((prev) =>
            prev.filter((p) => p.test_name.toLowerCase() !== name.toLowerCase())
        );
        try {
            if ((target as any)?.id && userId) {
                await supabase
                    .from("lab_schedule")
                    .delete()
                    .eq("id", (target as any).id)
                    .eq("user_id", userId);
            }
        } catch {}
    };

    // Auto-add schedule items for far severity or steep trend
    useEffect(() => {
        if (!scheduleLoaded) return;
        categoryKeys.forEach((cat) => {
            const rows = categories[cat];
            if (!rows) return;
            const latestBy: Record<string, DashboardRow> = {};
            rows.forEach((r) => {
                const t = new Date(
                    r.test_date || r.dateAdded || r.created_at || 0
                ).getTime();
                if (!latestBy[r.test_name]) latestBy[r.test_name] = r;
                else {
                    const prev = new Date(
                        latestBy[r.test_name].test_date ||
                            latestBy[r.test_name].dateAdded ||
                            latestBy[r.test_name].created_at ||
                            0
                    ).getTime();
                    if (t > prev) latestBy[r.test_name] = r;
                }
            });
            Object.values(latestBy).forEach((r) => {
                const sev = rangeSeverity(r.value, r.reference_range);
                if (sev === "far")
                    addSchedule({
                        test_name: r.test_name,
                        category: cat,
                        reason: "out_of_range",
                        doctor: (r as any).doctor || undefined,
                    });
                if (isSteepTrend(rows, r.test_name))
                    addSchedule({
                        test_name: r.test_name,
                        category: cat,
                        reason: "trend",
                        doctor: (r as any).doctor || undefined,
                    });
            });
        });
    }, [data, scheduleLoaded]);

    if (
        activeTab !== "main" &&
        activeTab !== "search" &&
        !categories[activeTab]
    ) {
        setActiveTab("main");
    }

    // summary counts now computed inside Sidebar

    return (
        <div className="mt-4 flex gap-6 relative animate-floatFade">
            <Sidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                categoryKeys={categoryKeys}
                schedule={schedule}
                data={data}
                rangeSeverity={rangeSeverity}
            />
            <main className="flex-1 min-w-0 animate-[fadeIn_0.4s_ease]">
                {activeTab === "main" ? (
                    <MainOverview
                        data={data}
                        categoryKeys={categoryKeys}
                        schedule={schedule}
                        markScheduleComplete={markScheduleComplete}
                        addSchedule={addSchedule}
                        removeSchedule={removeSchedule}
                        scheduleLoading={scheduleLoading}
                        scheduleError={scheduleError}
                    />
                ) : activeTab === "search" ? (
                    <SearchPanel allData={data} />
                ) : (
                    <CategoryPanel
                        category={activeTab}
                        rows={categories[activeTab]}
                    />
                )}
            </main>
        </div>
    );
}
