import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, Clock, ChevronLeft, ChevronRight, CalendarPlus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { de, enUS } from "date-fns/locale";
import RequestAppointmentCard from "@/components/client/RequestAppointmentCard";
import { getClientTz, formatTimeInTz, formatDateTimeInTz, tzLabel } from "@/lib/timezone";

interface Appointment {
  id: string;
  title: string;
  description: string | null;
  start_at: string;
  end_at: string;
  color: string | null;
}

const ClientCalendar = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const locale = lang === "de" ? de : enUS;
  const clientTz = getClientTz();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDepositor, setIsDepositor] = useState(false);
  const requestSectionRef = useRef<HTMLDivElement | null>(null);

  const shouldAutoOpen = searchParams.get("book") === "1";

  // Scroll the request section into view when arriving via deep link
  useEffect(() => {
    if (shouldAutoOpen && requestSectionRef.current) {
      requestSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      // Clean URL so refresh doesn't reopen
      const next = new URLSearchParams(searchParams);
      next.delete("book");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [{ data }, { data: profile }] = await Promise.all([
        supabase
          .from("appointments")
          .select("id, title, description, start_at, end_at, color")
          .eq("client_id", user.id)
          .order("start_at", { ascending: true }),
        supabase.from("profiles").select("is_lead").eq("id", user.id).maybeSingle(),
      ]);
      if (data) setAppointments(data);
      setIsDepositor(profile?.is_lead === false);
    };
    fetchAll();
  }, [user]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getAppointmentsForDay = (date: Date) =>
    appointments.filter((a) => isSameDay(new Date(a.start_at), date));

  const selectedAppointments = selectedDate ? getAppointmentsForDay(selectedDate) : [];

  const upcomingAppointments = appointments
    .filter((a) => new Date(a.start_at) >= new Date())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold">{t("Kalender", "Calendar")}</h1>
          <p className="text-sm text-muted-foreground">
            {t(
              "Ihre geplanten Termine und neue Beratungsanfragen",
              "Your scheduled appointments and new consultation requests"
            )}
          </p>
        </div>
        {isDepositor && (
          <Button
            size="lg"
            className="h-12 px-5 text-base shadow-md gap-2 self-start sm:self-auto"
            onClick={() => {
              requestSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              const next = new URLSearchParams(searchParams);
              next.set("book", "1");
              setSearchParams(next, { replace: true });
              setTimeout(() => {
                const cleared = new URLSearchParams(window.location.search);
                cleared.delete("book");
                setSearchParams(cleared, { replace: true });
              }, 300);
            }}
          >
            <CalendarPlus className="h-5 w-5" />
            {t("Termin buchen", "Book a meeting")}
          </Button>
        )}
      </div>

      {/* Highlight banner so clients can't miss the option */}
      {isDepositor && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
          <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="h-11 w-11 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {t("Brauchen Sie eine persönliche Beratung?", "Need a personal consultation?")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t(
                  "Fragen Sie unten in nur 30 Sekunden einen Termin mit Ihrem Account Manager an.",
                  "Request a meeting with your account manager below — takes only 30 seconds."
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{format(currentMonth, "MMMM yyyy", { locale })}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setCurrentMonth(new Date()); setSelectedDate(new Date()); }}>
                {t("Heute", "Today")}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {[t("Mo", "Mon"), t("Di", "Tue"), t("Mi", "Wed"), t("Do", "Thu"), t("Fr", "Fri"), t("Sa", "Sat"), t("So", "Sun")].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {days.map((day) => {
                const dayApps = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const inMonth = isSameMonth(day, currentMonth);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`relative min-h-[60px] p-1 text-left rounded-md transition-colors
                      ${!inMonth ? "text-muted-foreground/30" : ""}
                      ${isToday ? "ring-1 ring-primary" : ""}
                      ${isSelected ? "bg-primary/10" : "hover:bg-muted"}
                    `}
                  >
                    <span className={`text-xs font-medium ${isToday ? "text-primary font-bold" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {dayApps.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayApps.slice(0, 2).map((a) => (
                          <div
                            key={a.id}
                            className="text-[10px] leading-tight truncate rounded px-1 py-0.5 text-white"
                            style={{ backgroundColor: a.color || "hsl(var(--primary))" }}
                          >
                            {a.title}
                          </div>
                        ))}
                        {dayApps.length > 2 && (
                          <div className="text-[10px] text-muted-foreground">+{dayApps.length - 2}</div>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected day detail */}
            {selectedDate && (
              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-semibold mb-2">{format(selectedDate, "EEEE, d MMMM yyyy", { locale })}</h3>
                {selectedAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t("Keine Termine", "No appointments")}</p>
                ) : (
                  <div className="space-y-2">
                    {selectedAppointments.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 rounded-lg border p-3">
                        <div className="h-3 w-3 rounded-full mt-1 shrink-0" style={{ backgroundColor: a.color || "hsl(var(--primary))" }} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{a.title}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatTimeInTz(a.start_at, clientTz)} ({tzLabel(clientTz)})
                          </div>
                          {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6" ref={requestSectionRef}>
          {isDepositor && <RequestAppointmentCard autoOpen={shouldAutoOpen} />}

          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {t("Nächste Termine", "Upcoming")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("Keine anstehenden Termine", "No upcoming appointments")}</p>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((a) => (
                    <div key={a.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                      <div className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.color || "hsl(var(--primary))" }} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTimeInTz(a.start_at, clientTz)} ({tzLabel(clientTz)})
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientCalendar;
