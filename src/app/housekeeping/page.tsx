"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getRoomsWithGuests, updateRoom } from "@/lib/data-service";
import { getHousekeepingTasks, createHousekeepingTask, updateHousekeepingTask, getStaff } from "@/lib/staff-service";
import { createNotification } from "@/lib/notification-service";
import { cn } from "@/lib/utils";
import type { HousekeepingStatus, HousekeepingTaskFull, Room, Staff } from "@/lib/types";
import {
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  User,
  Plus,
  RotateCcw,
  Search,
  ArrowRight,
  Loader2,
  Wrench,
} from "lucide-react";

const statusConfig: Record<HousekeepingStatus, { label: string; icon: typeof Sparkles; color: string; badgeVariant: string }> = {
  clean: { label: "Temiz", icon: CheckCircle2, color: "text-emerald-600", badgeVariant: "success" },
  dirty: { label: "Kirli", icon: AlertTriangle, color: "text-amber-600", badgeVariant: "warning" },
  inspected: { label: "Kontrol Edildi", icon: CheckCircle2, color: "text-blue-600", badgeVariant: "info" },
  "in-progress": { label: "Temizleniyor", icon: Clock, color: "text-purple-600", badgeVariant: "default" },
  "out-of-service": { label: "Servis Dışı", icon: XCircle, color: "text-red-600", badgeVariant: "destructive" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Düşük", color: "bg-gray-100 text-gray-700" },
  medium: { label: "Orta", color: "bg-blue-100 text-blue-700" },
  high: { label: "Yüksek", color: "bg-orange-100 text-orange-700" },
  urgent: { label: "Acil", color: "bg-red-100 text-red-700" },
};

const taskTypeLabels: Record<string, string> = {
  checkout: "Check-out", stayover: "Konaklama", "deep-clean": "Derin Temizlik",
  turndown: "Turndown", inspection: "Kontrol", custom: "Özel",
};

export default function HousekeepingPage() {
  const [tasks, setTasks] = useState<HousekeepingTaskFull[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getRoomsWithGuests().then(setAllRooms).catch(() => {}),
      getHousekeepingTasks().then(setTasks).catch(() => {}),
      getStaff().then((s) => setStaffList(s.filter((st) => st.role === "housekeeping"))).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Assign task dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRoom, setAssignRoom] = useState("");
  const [assignPerson, setAssignPerson] = useState("");
  const [assignPriority, setAssignPriority] = useState("medium");
  const [assignNotes, setAssignNotes] = useState("");

  // Status change dialog
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogTask, setStatusDialogTask] = useState<HousekeepingTaskFull | null>(null);
  const [statusDialogTarget, setStatusDialogTarget] = useState<HousekeepingStatus>("clean");
  const [statusProcessing, setStatusProcessing] = useState(false);

  const assignees = useMemo(() =>
    [...new Set(tasks.map((t) => t.assignedToName).filter(Boolean))] as string[],
    [tasks]
  );

  const filteredTasks = useMemo(() =>
    tasks.filter((task) => {
      const hkStatus = task.status === "pending" ? "dirty" : task.status === "in_progress" ? "in-progress" : task.status === "completed" ? "clean" : task.status === "inspected" ? "inspected" : task.status;
      const matchesStatus = filterStatus === "all" || hkStatus === filterStatus;
      const matchesAssignee = filterAssignee === "all" || task.assignedToName === filterAssignee;
      const matchesSearch = searchTerm === "" ||
        task.roomNumber.includes(searchTerm) ||
        (task.assignedToName || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchesStatus && matchesAssignee && matchesSearch;
    }),
    [tasks, filterStatus, filterAssignee, searchTerm]
  );

  const dirtyCount = allRooms.filter((r) => r.housekeepingStatus === "dirty").length;
  const cleanCount = allRooms.filter((r) => r.housekeepingStatus === "clean").length;
  const inProgressCount = allRooms.filter((r) => r.housekeepingStatus === "in-progress").length;
  const inspectedCount = allRooms.filter((r) => r.housekeepingStatus === "inspected").length;

  // Map task status to housekeeping status
  const taskToHkStatus = (ts: string): HousekeepingStatus =>
    ts === "pending" ? "dirty" : ts === "in_progress" ? "in-progress" : ts === "completed" ? "clean" : ts === "inspected" ? "inspected" : "dirty";

  // ─── Status change handler ────────────────────────────────────────
  const changeTaskStatus = async (task: HousekeepingTaskFull) => {
    setStatusDialogTask(task);
    setStatusDialogTarget(taskToHkStatus(task.status));
    setStatusDialogOpen(true);
  };

  const confirmStatusChange = async () => {
    if (!statusDialogTask) return;
    setStatusProcessing(true);

    const taskStatus = statusDialogTarget === "dirty" ? "pending" : statusDialogTarget === "in-progress" ? "in_progress" : statusDialogTarget === "clean" ? "completed" : statusDialogTarget === "inspected" ? "inspected" : "pending";
    await updateHousekeepingTask(statusDialogTask.id, { status: taskStatus as any }).catch(() => {});

    const room = allRooms.find((r) => r.number === statusDialogTask.roomNumber);
    if (room) {
      const roomStatus = statusDialogTarget === "clean" || statusDialogTarget === "inspected" ? "vacant-clean" : "vacant-dirty";
      await updateRoom(room.id, { housekeepingStatus: statusDialogTarget, status: roomStatus as any }).catch(() => {});
      setAllRooms((prev) => prev.map((r) => r.number === statusDialogTask.roomNumber ? { ...r, housekeepingStatus: statusDialogTarget, status: roomStatus as any } : r));
    }

    setTasks((prev) => prev.map((t) => t.id === statusDialogTask.id ? { ...t, status: taskStatus as any } : t));
    setStatusProcessing(false);
    setStatusDialogOpen(false);
    setStatusDialogTask(null);
  };

  // Quick status change
  const quickChangeStatus = async (taskId: string, roomNumber: string, newHkStatus: HousekeepingStatus) => {
    const taskStatus = newHkStatus === "dirty" ? "pending" : newHkStatus === "in-progress" ? "in_progress" : newHkStatus === "clean" ? "completed" : newHkStatus === "inspected" ? "inspected" : "pending";
    await updateHousekeepingTask(taskId, {
      status: taskStatus as any,
      ...(taskStatus === "in_progress" ? { startedAt: new Date().toISOString() } : {}),
      ...(taskStatus === "completed" ? { completedAt: new Date().toISOString() } : {}),
    }).catch(() => {});

    const room = allRooms.find((r) => r.number === roomNumber);
    if (room) {
      const roomStatus = newHkStatus === "clean" || newHkStatus === "inspected" ? "vacant-clean" : "vacant-dirty";
      await updateRoom(room.id, { housekeepingStatus: newHkStatus, status: roomStatus as any }).catch(() => {});
      setAllRooms((prev) => prev.map((r) => r.number === roomNumber ? { ...r, housekeepingStatus: newHkStatus, status: roomStatus as any } : r));
    }

    setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: taskStatus as any } : t));
  };

  // ─── Assign task handler ──────────────────────────────────────────
  const openAssignDialog = () => {
    setAssignRoom("");
    setAssignPerson("");
    setAssignPriority("medium");
    setAssignNotes("");
    setAssignOpen(true);
  };

  const submitAssignTask = async () => {
    if (!assignRoom || !assignPerson) return;
    const room = allRooms.find((r) => r.number === assignRoom);
    if (!room) return;

    const staffMember = staffList.find((s) => s.name === assignPerson);
    const existingTask = tasks.find((t) => t.roomNumber === assignRoom && t.status !== "completed" && t.status !== "inspected");
    if (existingTask) {
      await updateHousekeepingTask(existingTask.id, {
        assignedTo: staffMember?.id, assignedToName: assignPerson,
        priority: assignPriority as any, notes: assignNotes || undefined,
      }).catch(() => {});
      setTasks((prev) =>
        prev.map((t) =>
          t.id === existingTask.id
            ? { ...t, assignedTo: staffMember?.id, assignedToName: assignPerson, priority: assignPriority as any, notes: assignNotes || t.notes }
            : t
        )
      );
    } else {
      const newTask = await createHousekeepingTask({
        roomNumber: room.number, floor: room.floor,
        taskType: "checkout", status: "pending",
        priority: assignPriority as any,
        assignedTo: staffMember?.id, assignedToName: assignPerson,
        notes: assignNotes || undefined,
      });
      setTasks((prev) => [newTask, ...prev]);
    }
    setAssignOpen(false);
  };

  // ─── Mark all pending as in-progress ────────────────────────────────
  const startAllDirty = async () => {
    const pending = tasks.filter((t) => t.status === "pending");
    for (const t of pending) {
      await updateHousekeepingTask(t.id, { status: "in_progress", startedAt: new Date().toISOString() }).catch(() => {});
    }
    setTasks((prev) =>
      prev.map((t) => (t.status === "pending" ? { ...t, status: "in_progress" as any } : t))
    );
    setAllRooms((prev) =>
      prev.map((r) =>
        r.housekeepingStatus === "dirty" ? { ...r, housekeepingStatus: "in-progress" as HousekeepingStatus } : r
      )
    );
  };

  // Dirty rooms for assignment
  const dirtyRooms = allRooms.filter((r) =>
    r.housekeepingStatus === "dirty" || r.housekeepingStatus === "in-progress"
  );
  const allRoomNumbers = allRooms.map((r) => r.number);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Housekeeping</h1>
          <p className="text-[13px] text-muted-foreground">Oda temizlik durumları ve görev yönetimi</p>
        </div>
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <Button variant="outline" size="sm" onClick={startAllDirty}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Tüm Kirli → Temizle
            </Button>
          )}
          <Button onClick={openAssignDialog}>
            <Plus className="mr-1.5 h-4 w-4" /> Görev Ata
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card
          className={cn("border-amber-200 bg-amber-50/50 cursor-pointer transition-all hover:shadow-md", filterStatus === "dirty" && "ring-2 ring-amber-400")}
          onClick={() => setFilterStatus(filterStatus === "dirty" ? "all" : "dirty")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <AlertTriangle className="h-8 w-8 text-amber-600" />
            <div>
              <p className="text-2xl font-bold">{dirtyCount}</p>
              <p className="text-sm text-muted-foreground">Kirli Oda</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn("border-purple-200 bg-purple-50/50 cursor-pointer transition-all hover:shadow-md", filterStatus === "in-progress" && "ring-2 ring-purple-400")}
          onClick={() => setFilterStatus(filterStatus === "in-progress" ? "all" : "in-progress")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Clock className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-sm text-muted-foreground">Temizleniyor</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn("border-emerald-200 bg-emerald-50/50 cursor-pointer transition-all hover:shadow-md", filterStatus === "clean" && "ring-2 ring-emerald-400")}
          onClick={() => setFilterStatus(filterStatus === "clean" ? "all" : "clean")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="text-2xl font-bold">{cleanCount}</p>
              <p className="text-sm text-muted-foreground">Temiz</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={cn("border-blue-200 bg-blue-50/50 cursor-pointer transition-all hover:shadow-md", filterStatus === "inspected" && "ring-2 ring-blue-400")}
          onClick={() => setFilterStatus(filterStatus === "inspected" ? "all" : "inspected")}
        >
          <CardContent className="flex items-center gap-4 p-4">
            <Sparkles className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{inspectedCount}</p>
              <p className="text-sm text-muted-foreground">Kontrol Edildi</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Oda veya personel ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-9 text-[13px]"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Atanan Kişi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Personel</SelectItem>
            {assignees.map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {(filterStatus !== "all" || filterAssignee !== "all" || searchTerm) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-[12px]"
            onClick={() => {
              setFilterStatus("all");
              setFilterAssignee("all");
              setSearchTerm("");
            }}
          >
            Filtreleri Temizle
          </Button>
        )}
      </div>

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Oda</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Kat</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Durum</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Öncelik</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Atanan</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Not</th>
                <th className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[13px] text-muted-foreground">
                    Bu filtreyle eşleşen görev bulunamadı
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const hkStatus = taskToHkStatus(task.status);
                  const sc = statusConfig[hkStatus] || statusConfig.dirty;
                  const pc = priorityConfig[task.priority];
                  const StatusIcon = sc.icon;
                  return (
                    <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-bold">{task.roomNumber}</td>
                      <td className="px-4 py-3 text-sm">Kat {task.floor}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={cn("h-4 w-4", sc.color)} />
                          <Badge variant={sc.badgeVariant as any} className="text-[10px]">
                            {sc.label}
                          </Badge>
                          {task.taskType && task.taskType !== "checkout" && (
                            <span className="text-[9px] text-muted-foreground">({taskTypeLabels[task.taskType] || task.taskType})</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", pc.color)}>
                          {pc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{task.assignedToName || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {task.notes || "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {(task.status === "pending" || task.status === "skipped") && (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => quickChangeStatus(task.id, task.roomNumber, "in-progress")}
                            >
                              <Clock className="mr-1 h-3 w-3" /> Temizle
                            </Button>
                          )}
                          {task.status === "in_progress" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => quickChangeStatus(task.id, task.roomNumber, "clean")}
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Tamamla
                            </Button>
                          )}
                          {task.status === "completed" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              className="h-7 text-xs"
                              onClick={() => quickChangeStatus(task.id, task.roomNumber, "inspected")}
                            >
                              <Sparkles className="mr-1 h-3 w-3" /> Kontrol Et
                            </Button>
                          )}
                          {task.status === "inspected" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-amber-600"
                              onClick={() => quickChangeStatus(task.id, task.roomNumber, "dirty")}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Kirli Yap
                            </Button>
                          )}
                          {false && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs"
                              onClick={() => quickChangeStatus(task.id, task.roomNumber, "dirty")}
                            >
                              <Wrench className="mr-1 h-3 w-3" /> Servise Al
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => changeTaskStatus(task)}
                          >
                            Durum Değiştir
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ═══ Assign Task Dialog ═══ */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Görev Ata</DialogTitle>
            <DialogDescription className="text-[12px]">
              Bir odaya temizlik görevi ve personel atayın
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-[12px] font-medium">Oda</label>
              <Select value={assignRoom} onValueChange={setAssignRoom}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Oda seçin..." /></SelectTrigger>
                <SelectContent>
                  {allRoomNumbers.map((num) => {
                    const rm = allRooms.find((r) => r.number === num);
                    return (
                      <SelectItem key={num} value={num}>
                        Oda {num} · Kat {rm?.floor} · {statusConfig[rm?.housekeepingStatus || "clean"]?.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium">Personel</label>
              <Select value={assignPerson} onValueChange={setAssignPerson}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Personel seçin..." /></SelectTrigger>
                <SelectContent>
                  {staffList.map((s) => (
                    <SelectItem key={s.id} value={s.name}>{s.name}{s.floorAssigned ? ` (Kat ${s.floorAssigned})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium">Öncelik</label>
              <Select value={assignPriority} onValueChange={setAssignPriority}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(priorityConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[12px] font-medium">Not (opsiyonel)</label>
              <Input
                className="mt-1"
                placeholder="Örn: Minibar kontrolü yapılacak"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>İptal</Button>
              <Button size="sm" onClick={submitAssignTask} disabled={!assignRoom || !assignPerson}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Görev Ata
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Status Change Dialog ═══ */}
      <Dialog open={statusDialogOpen} onOpenChange={(open) => { if (!open) setStatusDialogOpen(false); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[15px]">Durum Değiştir</DialogTitle>
            <DialogDescription className="text-[12px]">
              Oda {statusDialogTask?.roomNumber} için yeni durum seçin
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {Object.entries(statusConfig).map(([key, cfg]) => {
              const Icon = cfg.icon;
              const isActive = key === statusDialogTarget;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setStatusDialogTarget(key as HousekeepingStatus)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all",
                    isActive ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"
                  )}
                >
                  <Icon className={cn("h-4 w-4", cfg.color)} />
                  <span className="text-[12px] font-medium">{cfg.label}</span>
                  {isActive && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
                </button>
              );
            })}
            <Separator />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setStatusDialogOpen(false)}>İptal</Button>
              <Button size="sm" onClick={confirmStatusChange} disabled={statusProcessing}>
                {statusProcessing ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> İşleniyor...</>
                ) : (
                  <>Uygula <ArrowRight className="ml-1.5 h-3.5 w-3.5" /></>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
