import { useState, useEffect } from "react";
import { format, isToday, isFuture } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Check, Trash2, CalendarIcon, AlertCircle } from "lucide-react";
import Bookshelf from "@/components/Bookshelf";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";


const CATEGORIES = ["Schulaufgaben", "Lernen", "Haushalt"] as const;
type Category = (typeof CATEGORIES)[number];

type Priority = 1 | 2 | 3;

const PRIORITY_LABELS: Record<Priority, string> = {
  1: "Niedrig",
  2: "Mittel",
  3: "Hoch",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  1: "bg-muted/50 text-muted-foreground/60",
  2: "bg-accent/60 text-accent-foreground/70",
  3: "bg-primary/20 text-primary",
};

interface Task {
  id: string;
  text: string;
  done: boolean;
  category: Category;
  priority: Priority;
}

interface Appointment {
  id: string;
  text: string;
  date: Date;
  time: string;
  info: string;
  done: boolean;
}

const Index = () => {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { const s = localStorage.getItem("tasks"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [inputs, setInputs] = useState<Record<Category, string>>({
    Schulaufgaben: "",
    Lernen: "",
    Haushalt: "",
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      const s = localStorage.getItem("appointments");
      if (!s) return [];
      return JSON.parse(s).map((a: any) => ({ ...a, date: new Date(a.date) }));
    } catch { return []; }
  });
  const [appointmentInput, setAppointmentInput] = useState("");
  const [appointmentDate, setAppointmentDate] = useState<Date>();
  const [appointmentTime, setAppointmentTime] = useState("");
  const [appointmentInfo, setAppointmentInfo] = useState("");
  const [confirmToggleId, setConfirmToggleId] = useState<string | null>(null);
  const [confirmType, setConfirmType] = useState<"past" | "future" | null>(null);
  const [appointmentErrors, setAppointmentErrors] = useState<{ date?: boolean; time?: boolean; text?: boolean }>({});

  useEffect(() => { localStorage.setItem("tasks", JSON.stringify(tasks)); }, [tasks]);
  useEffect(() => { localStorage.setItem("appointments", JSON.stringify(appointments)); }, [appointments]);

  const addTask = (category: Category) => {
    const text = inputs[category].trim();
    if (!text) return;
    setTasks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text, done: false, category, priority: 2 },
    ]);
    setInputs((prev) => ({ ...prev, [category]: "" }));
  };

  const toggleTask = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );

  const deleteTask = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const setPriority = (id: string, priority: Priority) =>
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority } : t))
    );

  const tasksByCategory = (cat: Category) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    const done = catTasks.filter((t) => t.done);
    const open = catTasks.filter((t) => !t.done).sort((a, b) => b.priority - a.priority);
    return [...done, ...open];
  };

  const addAppointment = () => {
    const text = appointmentInput.trim();
    const time = appointmentTime.trim();
    const errors = {
      date: !appointmentDate,
      time: !time,
      text: !text,
    };
    setAppointmentErrors(errors);
    if (errors.date || errors.time || errors.text) return;
    setAppointments((prev) => [...prev, { id: crypto.randomUUID(), text, date: appointmentDate!, time, info: appointmentInfo, done: false }]);
    setAppointmentInput("");
    setAppointmentDate(undefined);
    setAppointmentTime("");
    setAppointmentInfo("");
    setAppointmentErrors({});
  };

  const isAppointmentInFuture = (appt: Appointment) => {
    if (!appt.time) return isFuture(appt.date) && !isToday(appt.date);
    const [hours, minutes] = appt.time.split(":").map(Number);
    const apptDateTime = new Date(appt.date);
    apptDateTime.setHours(hours, minutes, 0, 0);
    return apptDateTime > new Date();
  };

  const handleToggleAppointment = (id: string) => {
    const appt = appointments.find((a) => a.id === id);
    if (!appt) return;
    if (appt.done) {
      setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, done: false } : a)));
      return;
    }
    if (isAppointmentInFuture(appt)) {
      setConfirmType("future");
      setConfirmToggleId(id);
      return;
    }
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, done: true } : a)));
  };

  const confirmToggle = () => {
    if (confirmToggleId) {
      setAppointments((prev) => prev.map((a) => (a.id === confirmToggleId ? { ...a, done: true } : a)));
      setConfirmToggleId(null);
    }
  };

  const deleteAppointment = (id: string) =>
    setAppointments((prev) => prev.filter((a) => a.id !== id));

  const sortedAppointments = [
    ...appointments.filter((a) => a.done).sort((a, b) => a.date.getTime() - b.date.getTime()),
    ...appointments.filter((a) => !a.done).sort((a, b) => a.date.getTime() - b.date.getTime()),
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">

      <div className="relative z-10 flex items-start justify-center px-4 py-12 sm:py-20">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-2">
              <h1
                className="text-5xl sm:text-7xl font-bold tracking-tight"
                style={{ fontFamily: '"Great Vibes", cursive', color: '#563315' }}
              >
                To Do
              </h1>
            </div>
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat}
                className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-col shadow-sm hover:shadow-md transition-shadow"
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  {cat}
                </h2>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTask(cat);
                  }}
                  className="flex gap-2 mb-4"
                >
                  <Input
                    value={inputs[cat]}
                    onChange={(e) =>
                      setInputs((prev) => ({ ...prev, [cat]: e.target.value }))
                    }
                    placeholder="Neue Aufgabe…"
                    className="flex-1 h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40"
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </form>

                <div className="space-y-2 flex-1">
                  {tasksByCategory(cat).length === 0 && (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Keine Aufgaben
                    </p>
                  )}
                  {tasksByCategory(cat).map((task) => (
                    <div
                      key={task.id}
                      className={cn(
                        "group flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2.5 transition-all hover:bg-accent/40",
                        task.done && "opacity-50"
                      )}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <span
                          className={cn(
                            "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                            task.done
                              ? "border-primary bg-primary"
                              : "border-muted-foreground/40"
                          )}
                        >
                          {task.done && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </span>
                        <span
                          className={cn(
                            "text-sm text-foreground transition-all",
                            task.done && "line-through text-muted-foreground"
                          )}
                        >
                          {task.text}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 shrink-0">
                        {([1, 2, 3] as Priority[]).map((p) => (
                          <button
                            key={p}
                            onClick={() => setPriority(task.id, p)}
                            className={cn(
                              "h-2.5 w-2.5 rounded-full transition-all",
                              p === 1 && (task.priority === 1 ? "bg-[#827830]" : "bg-[#827830]/25"),
                              p === 2 && (task.priority === 2 ? "bg-[#563315]" : "bg-[#563315]/25"),
                              p === 3 && (task.priority === 3 ? "bg-[#db904f]" : "bg-[#db904f]/25"),
                            )}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/40">
                  {tasksByCategory(cat).filter((t) => !t.done).length} offen ·{" "}
                  {tasksByCategory(cat).filter((t) => t.done).length} erledigt
                </p>
              </div>
            ))}
          </div>

          {/* Termine Section */}
          <div className="text-center mt-16 mb-8">
            <div className="inline-flex items-center gap-3">
              <h2
                className="text-5xl sm:text-7xl font-bold tracking-tight"
                style={{ fontFamily: '"Great Vibes", cursive', color: '#563315' }}
              >
                Termine
              </h2>
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm p-5 flex flex-col shadow-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addAppointment();
              }}
              className="flex flex-wrap gap-2 mb-4"
            >
              <div className="relative shrink-0">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal h-10 bg-background/60 border-border/50",
                        !appointmentDate && "text-muted-foreground/40",
                        appointmentErrors.date && "border-[#db904f] border-2"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {appointmentDate ? format(appointmentDate, "dd.MM.yy", { locale: de }) : "Datum"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={appointmentDate}
                      onSelect={(d) => { setAppointmentDate(d); setAppointmentErrors((e) => ({ ...e, date: false })); }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
                {appointmentErrors.date && <AlertCircle className="absolute -right-1 -top-1 h-4 w-4 text-[#c46d21]" />}
              </div>
              <div className="relative shrink-0">
                <Input
                  type="time"
                  value={appointmentTime}
                  onChange={(e) => { setAppointmentTime(e.target.value); setAppointmentErrors((err) => ({ ...err, time: false })); }}
                  className={cn(
                    "w-[100px] h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40",
                    appointmentErrors.time && "border-[#db904f] border-2"
                  )}
                />
                {appointmentErrors.time && <AlertCircle className="absolute -right-1 -top-1 h-4 w-4 text-[#c46d21]" />}
              </div>
              <div className="relative flex-1 min-w-[120px]">
                <Input
                  value={appointmentInput}
                  onChange={(e) => { setAppointmentInput(e.target.value); setAppointmentErrors((err) => ({ ...err, text: false })); }}
                  placeholder="Termin…"
                  className={cn(
                    "h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40",
                    appointmentErrors.text && "border-[#db904f] border-2"
                  )}
                />
                {appointmentErrors.text && <AlertCircle className="absolute -right-1 -top-1 h-4 w-4 text-[#c46d21]" />}
              </div>
              <Input
                value={appointmentInfo}
                onChange={(e) => setAppointmentInfo(e.target.value)}
                placeholder="Zusatzinfo…"
                className="flex-1 min-w-[120px] h-10 bg-background/60 border-border/50 text-foreground placeholder:text-muted-foreground/40"
              />
              <Button type="submit" size="icon" className="h-10 w-10 shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </form>

            <div className="space-y-2 flex-1">
              {sortedAppointments.length === 0 && (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  Keine Termine
                </p>
              )}
              {sortedAppointments.map((appt) => (
                <div
                  key={appt.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-xl border border-border/40 px-3 py-2.5 transition-all hover:bg-accent/40",
                    appt.done && "opacity-50"
                  )}
                >
                  <button
                    onClick={() => handleToggleAppointment(appt.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        appt.done
                          ? "border-primary bg-primary"
                          : "border-muted-foreground/40"
                      )}
                    >
                      {appt.done && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </span>
                    <div className="flex flex-col flex-1">
                      <span
                        className={cn(
                          "text-sm text-foreground transition-all",
                          appt.done && "line-through text-muted-foreground"
                        )}
                      >
                        {appt.text}
                      </span>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{format(appt.date, "dd.MM.yyyy", { locale: de })}</span>
                        {appt.time && <span>· {appt.time}</span>}
                      </div>
                      {appt.info && (
                        <span className="text-xs text-muted-foreground/70 mt-0.5">{appt.info}</span>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteAppointment(appt.id)}
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border/40">
              {sortedAppointments.filter((a) => !a.done).length} offen ·{" "}
              {sortedAppointments.filter((a) => a.done).length} erledigt
            </p>
          </div>

          {/* Bücher Section */}
          <div className="text-center mt-16 mb-8">
            <div className="inline-flex items-center gap-3">
              <h2
                className="text-5xl sm:text-7xl font-bold tracking-tight"
                style={{ fontFamily: '"Great Vibes", cursive', color: '#563315' }}
              >
                Bücher
              </h2>
            </div>
          </div>

          <Bookshelf />

          <AlertDialog open={!!confirmToggleId} onOpenChange={(open) => !open && setConfirmToggleId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Termin abhaken?</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmType === "future"
                    ? "Das Datum oder die Uhrzeit dieses Termins liegt in der Zukunft. Möchtest du diesen Termin trotzdem als erledigt abhaken?"
                    : "Das Datum dieses Termins stimmt nicht mit dem heutigen Datum überein. Möchtest du ihn trotzdem als erledigt markieren?"}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-[#6890a8] text-primary-foreground border-[#6890a8] hover:bg-[#6890a8]/90 hover:text-primary-foreground">Abbrechen</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => { if (confirmToggleId) { deleteAppointment(confirmToggleId); setConfirmToggleId(null); } }}
                  className="bg-[#db904f] text-primary-foreground border-[#db904f] hover:bg-[#db904f]/90"
                >
                  Termin löschen
                </AlertDialogAction>
                <AlertDialogAction onClick={confirmToggle}>Trotzdem abhaken</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default Index;
