"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useStaff } from "../staff-context";
import type { HousekeepingTaskFull, Room } from "@/lib/types";
import { getHousekeepingTasks, createHousekeepingTask, updateHousekeepingTask } from "@/lib/staff-service";
import { getRoomsWithGuests, updateRoom } from "@/lib/data-service";
import { createNotification } from "@/lib/notification-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Bed, Clock, CheckCircle2, Play, AlertTriangle, Sparkles,
  ChevronRight, Timer, MessageSquare, RefreshCw, Loader2,
} from "lucide-react";

const priorityConfig: Record<string, { label: string; color: string; dot: string }> = {
  urgent: { label: "Acil", color: "bg-red-100 text-red-700 border-red-200", dot: "bg-red-500" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  medium: { label: "Normal", color: "bg-blue-100 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  low: { label: "Düşük", color: "bg-gray-100 text-gray-700 border-gray-200", dot: "bg-gray-400" },
};

const taskTypeLabels: Record<string, string> = {
  checkout: "Check-out Temizlik", stayover: "Konaklama Temizlik",
  "deep-clean": "Derin Temizlik", turndown: "Turndown",
  inspection: "Kontrol", custom: "Özel Görev",
};

const statusConfig: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "Bekliyor", icon: Clock, color: "text-amber-600" },
  in_progress: { label: "Yapılıyor", icon: Play, color: "text-blue-600" },
  completed: { label: "Tamamlandı", icon: CheckCircle2, color: "text-emerald-600" },
  inspected: { label: "Kontrol Edildi", icon: Sparkles, color: "text-purple-600" },
  skipped: { label: "Atlandı", icon: AlertTriangle, color: "text-gray-500" },
};

export default function HousekeepingStaffPage() {
  const { staff } = useStaff();
  const [tasks, setTasks] = useState<HousekeepingTaskFull[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");
  const [selectedTask, setSelectedTask] = useState<HousekeepingTaskFull | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [issueNote, setIssueNote] = useState("");
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [t, r] = await Promise.all([getHousekeepingTasks(), getRoomsWithGuests()]);
      setTasks(t);
      setRooms(r);

      // Auto-generate tasks from dirty rooms if none exist
      if (t.length === 0 && r.length > 0) {
        const dirtyRooms = r.filter((rm) => rm.housekeepingStatus === "dirty" || rm.status === "vacant-dirty");
        for (const rm of dirtyRooms) {
          await createHousekeepingTask({
            roomNumber: rm.number, floor: rm.floor,
            taskType: "checkout", status: "pending", priority: "medium",
          });
        }
        if (dirtyRooms.length > 0) {
          const refreshed = await getHousekeepingTasks();
          setTasks(refreshed);
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
    const iv = setInterval(() => {
      getHousekeepingTasks().then(setTasks).catch(() => {});
    }, 10_000);
    return () => clearInterval(iv);
  }, []);

  // Timer
  useEffect(() => {
    if (!timerStart) return;
    const iv = setInterval(() => setElapsed(Math.floor((Date.now() - timerStart) / 1000)), 1000);
    return () => clearInterval(iv);
  }, [timerStart]);

  const refresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const myTasks = useMemo(() =>
    tasks.filter((t) =>
      (t.assignedToName === staff.name || t.assignedTo === staff.id) &&
      t.status !== "completed" && t.status !== "inspected"
    ).sort((a, b) => {
      const prio = ["urgent", "high", "medium", "low"];
      return prio.indexOf(a.priority) - prio.indexOf(b.priority);
    }),
  [tasks, staff]);

  const unassigned = useMemo(() =>
    tasks.filter((t) => !t.assignedTo && !t.assignedToName && t.status === "pending"),
  [tasks]);

  const completedToday = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return tasks.filter((t) =>
      (t.status === "completed" || t.status === "inspected") &&
      t.completedAt?.startsWith(today)
    );
  }, [tasks]);

  const handleClaimTask = async (task: HousekeepingTaskFull) => {
    await updateHousekeepingTask(task.id, { assignedTo: staff.id, assignedToName: staff.name });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, assignedTo: staff.id, assignedToName: staff.name } : t));
  };

  const handleStartTask = async (task: HousekeepingTaskFull) => {
    const now = new Date().toISOString();
    await updateHousekeepingTask(task.id, { status: "in_progress", startedAt: now });
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "in_progress", startedAt: now } : t));
    setTimerStart(Date.now());
    setElapsed(0);
  };

  const handleCompleteTask = async (task: HousekeepingTaskFull) => {
    const now = new Date().toISOString();
    const duration = timerStart ? Math.round((Date.now() - timerStart) / 60000) : undefined;
    await updateHousekeepingTask(task.id, {
      status: "completed", completedAt: now,
      durationMinutes: duration,
      issuesFound: issueNote || undefined,
    });
    // Update room status
    const room = rooms.find((r) => r.number === task.roomNumber);
    if (room) {
      await updateRoom(room.id, { housekeepingStatus: "clean", status: "vacant-clean" }).catch(() => {});
      setRooms((prev) => prev.map((r) => r.id === room.id ? { ...r, housekeepingStatus: "clean" as const, status: "vacant-clean" as const } : r));
    }
    // Send notification to reception
    createNotification({
      type: "housekeeping",
      title: `Oda ${task.roomNumber} Temizlendi`,
      description: `${staff.name} tarafından tamamlandı${duration ? ` (${duration} dk)` : ""}${issueNote ? ` — Not: ${issueNote}` : ""}`,
      roomNumber: task.roomNumber,
    }).catch(() => {});

    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: "completed", completedAt: now, durationMinutes: duration, issuesFound: issueNote || undefined } : t));
    setTimerStart(null);
    setElapsed(0);
    setIssueNote("");
    setDetailOpen(false);
  };

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const openDetail = (task: HousekeepingTaskFull) => {
    setSelectedTask(task);
    setIssueNote(task.issuesFound || "");
    setDetailOpen(true);
    if (task.status === "in_progress" && task.startedAt) {
      setTimerStart(new Date(task.startedAt).getTime());
    } else {
      setTimerStart(null);
      setElapsed(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const TaskCard = ({ task, showClaim }: { task: HousekeepingTaskFull; showClaim?: boolean }) => {
    const sc = statusConfig[task.status] || statusConfig.pending;
    const pc = priorityConfig[task.priority] || priorityConfig.medium;
    return (
      <Card
        className="cursor-pointer active:scale-[0.99] transition-transform"
        onClick={() => openDetail(task)}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Bed className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold">Oda {task.roomNumber}</span>
                  <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", pc.color)}>
                    {pc.label}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {taskTypeLabels[task.taskType]} • Kat {task.floor}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <sc.icon className={cn("h-3.5 w-3.5", sc.color)} />
              <span className={cn("text-[10px] font-medium", sc.color)}>{sc.label}</span>
            </div>
          </div>
          {task.notes && (
            <div className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 p-2">
              <MessageSquare className="h-3 w-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <span className="text-[10px] text-amber-800 line-clamp-2">{task.notes}</span>
            </div>
          )}
          {showClaim && (
            <Button
              size="sm"
              className="w-full mt-2 h-8 text-xs"
              onClick={(e) => { e.stopPropagation(); handleClaimTask(task); }}
            >
              Görevi Al
            </Button>
          )}
          {task.durationMinutes && task.status === "completed" && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Timer className="h-3 w-3" /> {task.durationMinutes} dk
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-57px)]">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 p-3 bg-white border-b">
        <div className="text-center">
          <div className="text-lg font-bold text-blue-600">{myTasks.filter((t) => t.status === "pending" || t.status === "in_progress").length}</div>
          <div className="text-[10px] text-muted-foreground">Bekleyen</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600">{myTasks.filter((t) => t.status === "in_progress").length}</div>
          <div className="text-[10px] text-muted-foreground">Devam Eden</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-emerald-600">{completedToday.length}</div>
          <div className="text-[10px] text-muted-foreground">Bugün Biten</div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="px-3 pt-2 bg-white border-b flex items-center justify-between">
          <TabsList className="h-9">
            <TabsTrigger value="my" className="text-xs px-3">Görevlerim ({myTasks.length})</TabsTrigger>
            <TabsTrigger value="available" className="text-xs px-3">Boştakiler ({unassigned.length})</TabsTrigger>
            <TabsTrigger value="done" className="text-xs px-3">Bitmiş</TabsTrigger>
          </TabsList>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          <TabsContent value="my" className="p-3 space-y-2 mt-0">
            {myTasks.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Atanmış göreviniz yok</div>
            ) : myTasks.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>

          <TabsContent value="available" className="p-3 space-y-2 mt-0">
            {unassigned.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Boşta görev yok</div>
            ) : unassigned.map((t) => <TaskCard key={t.id} task={t} showClaim />)}
          </TabsContent>

          <TabsContent value="done" className="p-3 space-y-2 mt-0">
            {completedToday.length === 0 ? (
              <div className="text-center py-10 text-sm text-muted-foreground">Bugün tamamlanan görev yok</div>
            ) : completedToday.map((t) => <TaskCard key={t.id} task={t} />)}
          </TabsContent>
        </div>
      </Tabs>

      {/* Task Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Oda {selectedTask?.roomNumber}</DialogTitle>
          </DialogHeader>
          {selectedTask && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Görev</span><p className="font-medium">{taskTypeLabels[selectedTask.taskType]}</p></div>
                <div><span className="text-muted-foreground text-xs">Kat</span><p className="font-medium">{selectedTask.floor}</p></div>
                <div><span className="text-muted-foreground text-xs">Öncelik</span>
                  <Badge variant="outline" className={cn("text-[10px]", priorityConfig[selectedTask.priority]?.color)}>
                    {priorityConfig[selectedTask.priority]?.label}
                  </Badge>
                </div>
                <div><span className="text-muted-foreground text-xs">Durum</span>
                  <p className={cn("font-medium text-sm", statusConfig[selectedTask.status]?.color)}>
                    {statusConfig[selectedTask.status]?.label}
                  </p>
                </div>
              </div>

              {/* Timer */}
              {(selectedTask.status === "in_progress" || timerStart) && (
                <div className="flex items-center justify-center py-3 rounded-xl bg-blue-50">
                  <Timer className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-2xl font-mono font-bold text-blue-700">{formatTimer(elapsed)}</span>
                </div>
              )}

              {/* Issue note */}
              {(selectedTask.status === "in_progress") && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Sorun / Not</label>
                  <Textarea
                    placeholder="Odada bir sorun varsa yazın..."
                    value={issueNote}
                    onChange={(e) => setIssueNote(e.target.value)}
                    className="text-sm min-h-[60px]"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {selectedTask.status === "pending" && (
                  <Button className="flex-1 h-11" onClick={() => { handleStartTask(selectedTask); setSelectedTask({ ...selectedTask, status: "in_progress" }); }}>
                    <Play className="h-4 w-4 mr-1.5" /> Başla
                  </Button>
                )}
                {selectedTask.status === "in_progress" && (
                  <Button className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleCompleteTask(selectedTask)}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" /> Tamamla
                  </Button>
                )}
                <Button variant="outline" className="h-11" onClick={() => setDetailOpen(false)}>
                  Kapat
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
