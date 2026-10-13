import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Shield, LogOut, Tag, Plus, Pencil, Trash2, Globe, Bell, UserCog, Lock, Palette, Users, Sun, Moon, FileText, BarChart3, Languages, UserPlus, ShieldCheck, Megaphone, Layout, UserCheck, Key, Phone, Box, Clock, CreditCard, Send, Mail, Bitcoin } from "lucide-react";
import BtcAddressPoolManager from "@/components/admin/BtcAddressPoolManager";
import { useTheme } from "@/hooks/useTheme";
import RolesManager from "@/components/admin/RolesManager";
import PhonePrefixesManager from "@/components/admin/PhonePrefixesManager";
import AssetsManager from "@/components/admin/AssetsManager";
import PaymentLinksManager from "@/components/admin/PaymentLinksManager";
import TelegramBotManager from "@/components/admin/TelegramBotManager";
import EmailLogViewer from "@/components/admin/EmailLogViewer";
import { useNavigate } from "react-router-dom";
import { invalidateStatusCache } from "@/components/admin/StatusChanger";
import KycUpload from "@/components/client/KycUpload";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const { user, signOut } = useAuth();
  const { isStaff, roleName } = useRole();
  const isAdmin = roleName === "Admin";
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", phone: "", country: "" });
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });
  const [selectedTimezone, setSelectedTimezone] = useState(() => localStorage.getItem("staff_timezone") || "Asia/Jerusalem");
  // Status management
  const [statuses, setStatuses] = useState<any[]>([]);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<any>(null);
  const [statusForm, setStatusForm] = useState({ name: "", color: "bg-muted text-muted-foreground" });

  // Platform settings (admin only)
  const [platformSettings, setPlatformSettings] = useState<Record<string, any>>({});
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [affiliates, setAffiliates] = useState<any[]>([]);

  const colorOptions = [
    { label: "Green", value: "bg-success/10 text-success" },
    { label: "Red", value: "bg-destructive/10 text-destructive" },
    { label: "Yellow", value: "bg-yellow-500/10 text-yellow-600" },
    { label: "Blue", value: "bg-blue-500/10 text-blue-600" },
    { label: "Purple", value: "bg-purple-500/10 text-purple-600" },
    { label: "Orange", value: "bg-orange-500/10 text-orange-600" },
    { label: "Primary", value: "bg-primary/10 text-primary" },
    { label: "Gray", value: "bg-muted text-muted-foreground" },
  ];

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      setProfile(data);
      if (data) setForm({ full_name: data.full_name ?? "", phone: data.phone ?? "", country: data.country ?? "" });
      setLoading(false);
    });
  }, [user]);

  const fetchStatuses = async () => {
    const { data } = await supabase.from("lead_statuses").select("*").order("sort_order");
    setStatuses(data ?? []);
  };

  const fetchPlatformSettings = async () => {
    const { data } = await supabase.from("platform_settings").select("*");
    const map: Record<string, any> = {};
    (data ?? []).forEach((row: any) => { map[row.key] = row.value; });
    setPlatformSettings(map);
  };

  useEffect(() => {
    if (isAdmin) fetchStatuses();
    if (isAdmin) {
      fetchPlatformSettings();
      // Fetch agents (staff profiles)
      (async () => {
        const { data: urData } = await supabase.from("user_roles").select("user_id");
        const staffIds = (urData ?? []).map((ur: any) => ur.user_id);
        if (staffIds.length > 0) {
          const { data: profiles } = await supabase.from("profiles").select("id, full_name, email").in("id", staffIds);
          setAgents(profiles ?? []);
        }
        const { data: affs } = await supabase.from("affiliates").select("id, name, status").eq("status", "active");
        setAffiliates(affs ?? []);
      })();
    }
  }, [isStaff, isAdmin]);

  const updateProfile = async () => {
    if (!user) return;
    await supabase.from("profiles").update(form).eq("id", user.id);
    toast.success(isStaff ? "Profile updated" : "Profil aktualisiert");
  };

  const updatePassword = async () => {
    if (passwordForm.password !== passwordForm.confirm) { toast.error(isStaff ? "Passwords do not match" : "Passwörter stimmen nicht überein"); return; }
    if (passwordForm.password.length < 6) { toast.error(isStaff ? "Minimum 6 characters" : "Mindestens 6 Zeichen"); return; }
    const { error } = await supabase.auth.updateUser({ password: passwordForm.password });
    if (error) toast.error(error.message);
    else { toast.success(isStaff ? "Password updated" : "Passwort aktualisiert"); setPasswordForm({ password: "", confirm: "" }); }
  };

  const handleSignOut = async () => { await signOut(); navigate("/login"); };

  const openStatusDialog = (status?: any) => {
    if (status) { setEditingStatus(status); setStatusForm({ name: status.name, color: status.color }); }
    else { setEditingStatus(null); setStatusForm({ name: "", color: "bg-muted text-muted-foreground" }); }
    setStatusDialogOpen(true);
  };

  const saveStatus = async () => {
    if (!statusForm.name.trim()) { toast.error("Status name is required"); return; }
    if (editingStatus) {
      await supabase.from("lead_statuses").update({ name: statusForm.name, color: statusForm.color }).eq("id", editingStatus.id);
      toast.success("Status updated");
    } else {
      const maxOrder = statuses.length > 0 ? Math.max(...statuses.map(s => s.sort_order)) : 0;
      await supabase.from("lead_statuses").insert({ name: statusForm.name, color: statusForm.color, sort_order: maxOrder + 1 });
      toast.success("Status created");
    }
    invalidateStatusCache();
    setStatusDialogOpen(false);
    fetchStatuses();
  };

  const deleteStatus = async (id: string) => {
    await supabase.from("lead_statuses").delete().eq("id", id);
    toast.success("Status deleted");
    invalidateStatusCache();
    fetchStatuses();
  };

  const savePlatformSetting = async (key: string, value: any) => {
    setSettingsLoading(true);
    const { error } = await supabase.from("platform_settings").upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

    if (error) {
      toast.error(error.message || "Failed to save settings");
      setSettingsLoading(false);
      return;
    }

    const nextSettings = { ...platformSettings, [key]: value };
    setPlatformSettings(nextSettings);
    toast.success(isStaff ? "Settings saved" : "Einstellungen gespeichert");
    setSettingsLoading(false);
  };

  const updateSettingField = (section: string, field: string, value: any) => {
    setPlatformSettings(prev => ({
      ...prev,
      [section]: { ...(prev[section] ?? {}), [field]: value },
    }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>;

  const t = isStaff
    ? {
        title: "Settings",
        subtitle: isAdmin ? "Platform configuration & account settings" : "Manage your account",
        account: "Account", security: "Security", documents: "Documents",
        profile: "Profile", email: "Email", fullName: "Full Name", phone: "Phone", country: "Country",
        saveChanges: "Save changes",
        appearance: "Appearance", appearanceDesc: "Switch between light and dark mode", darkMode: "Dark Mode",
        signOut: "Sign Out",
        changePassword: "Change Password", newPassword: "New Password", confirmPassword: "Confirm Password",
        updatePassword: "Update Password",
      }
    : {
        title: "Einstellungen",
        subtitle: "Verwalten Sie Ihr Konto",
        account: "Konto", security: "Sicherheit", documents: "Dokumente",
        profile: "Profil", email: "E-Mail", fullName: "Vollständiger Name", phone: "Telefon", country: "Land",
        saveChanges: "Änderungen speichern",
        appearance: "Darstellung", appearanceDesc: "Zwischen hellem und dunklem Modus wechseln", darkMode: "Dunkler Modus",
        signOut: "Abmelden",
        changePassword: "Passwort ändern", newPassword: "Neues Passwort", confirmPassword: "Passwort bestätigen",
        updatePassword: "Passwort aktualisieren",
      };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold">{t.title}</h1>
        <p className="text-muted-foreground text-sm">{t.subtitle}</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap md:flex-wrap h-auto gap-1">
          <TabsTrigger value="account" className="gap-1.5"><User className="h-3.5 w-3.5" /> {t.account}</TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5"><Lock className="h-3.5 w-3.5" /> {t.security}</TabsTrigger>
          {!isStaff && <TabsTrigger value="documents" className="gap-1.5"><FileText className="h-3.5 w-3.5" /> {t.documents}</TabsTrigger>}
          {isAdmin && <TabsTrigger value="statuses" className="gap-1.5"><Tag className="h-3.5 w-3.5" /> Statuses</TabsTrigger>}
          
          {isAdmin && <TabsTrigger value="localization" className="gap-1.5"><Languages className="h-3.5 w-3.5" /> Localization</TabsTrigger>}
          {isAdmin && <TabsTrigger value="registration" className="gap-1.5"><UserPlus className="h-3.5 w-3.5" /> Registration</TabsTrigger>}
          {isAdmin && <TabsTrigger value="auth-security" className="gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Auth & Security</TabsTrigger>}
          {isAdmin && <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>}
          
          {isAdmin && <TabsTrigger value="auto-assign" className="gap-1.5"><UserCheck className="h-3.5 w-3.5" /> Auto Assign</TabsTrigger>}
          {isAdmin && <TabsTrigger value="roles" className="gap-1.5"><Key className="h-3.5 w-3.5" /> Roles</TabsTrigger>}
          {isAdmin && <TabsTrigger value="assets" className="gap-1.5"><Box className="h-3.5 w-3.5" /> Assets</TabsTrigger>}
          {isAdmin && <TabsTrigger value="phone-prefixes" className="gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone Prefixes</TabsTrigger>}
          {isAdmin && <TabsTrigger value="payment-links" className="gap-1.5"><CreditCard className="h-3.5 w-3.5" /> Payment Links</TabsTrigger>}
          {isAdmin && <TabsTrigger value="telegram-bot" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Telegram Bot</TabsTrigger>}
          {isAdmin && <TabsTrigger value="email-log" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Log</TabsTrigger>}
          {isAdmin && <TabsTrigger value="email-features" className="gap-1.5"><Mail className="h-3.5 w-3.5" /> Email Features</TabsTrigger>}
          {isAdmin && <TabsTrigger value="btc-pool" className="gap-1.5"><Bitcoin className="h-3.5 w-3.5" /> Crypto Pools</TabsTrigger>}
        </TabsList>

        {/* ACCOUNT TAB */}
        <TabsContent value="account" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <User className="h-4 w-4" /> {t.profile}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>{t.email}</Label>
                <Input value={profile?.email ?? ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-1">
                <Label>{t.fullName}</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{t.phone}</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{t.country}</Label>
                  <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                </div>
              </div>
              <Button onClick={updateProfile}>{t.saveChanges}</Button>
            </CardContent>
          </Card>

          {/* Verification Code - Client only */}
          {!isStaff && profile?.verification_code && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Ihr Sicherheits-Verifizierungscode
                </CardTitle>
                <CardDescription>
                  Dieser Code ist Ihr persönlicher Sicherheitsschlüssel, um zu bestätigen, dass jemand, der Sie kontaktiert, wirklich von unserem Unternehmen ist.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="bg-background border-2 border-primary rounded-lg px-6 py-3">
                    <span className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{profile.verification_code}</span>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm space-y-2">
                  <p className="font-semibold text-yellow-700 dark:text-yellow-400 flex items-center gap-1.5">
                    <Shield className="h-4 w-4" /> Wichtiger Sicherheitshinweis
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                    <li><strong>Geben Sie niemals persönliche Informationen</strong> (Passwörter, Bankdaten etc.) an Personen weiter, die behaupten, von unserem Unternehmen zu sein, <strong>bevor Sie deren Identität überprüft haben.</strong></li>
                    <li>Wenn Sie jemand in unserem Auftrag kontaktiert, <strong>bitten Sie diese Person, Ihnen zuerst Ihren Verifizierungscode zu nennen.</strong></li>
                    <li>Wenn der genannte Code <strong>mit dem oben angezeigten Code übereinstimmt</strong>, können Sie darauf vertrauen, dass es sich um einen verifizierten Vertreter handelt.</li>
                    <li>Wenn die Person <strong>den korrekten Code nicht nennen kann</strong>, geben Sie keine Informationen weiter und kontaktieren Sie uns direkt über das Support-Center.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />} {t.appearance}
              </CardTitle>
              <CardDescription>{t.appearanceDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Label>{t.darkMode}</Label>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>
            </CardContent>
          </Card>

          {isStaff && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Timezone
                </CardTitle>
                <CardDescription>Set your preferred timezone for the backoffice clock</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select
                  value={selectedTimezone}
                  onValueChange={async (tz) => {
                    setSelectedTimezone(tz);
                    localStorage.setItem("staff_timezone", tz);
                    if (user) await supabase.from("profiles").update({ timezone: tz }).eq("id", user.id);
                    toast.success(`Timezone set to ${tz}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {[
                      "Europe/Berlin", "Europe/London", "Europe/Paris", "Europe/Zurich",
                      "Europe/Vienna", "Europe/Amsterdam", "Europe/Madrid", "Europe/Rome",
                      "Europe/Stockholm", "Europe/Warsaw", "Europe/Moscow",
                      "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
                      "America/Toronto", "America/Sao_Paulo", "America/Mexico_City",
                      "Asia/Dubai", "Asia/Kolkata", "Asia/Shanghai", "Asia/Tokyo", "Asia/Singapore",
                      "Asia/Hong_Kong", "Asia/Seoul", "Asia/Bangkok",
                      "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
                      "Africa/Cairo", "Africa/Johannesburg", "Africa/Lagos",
                      "UTC",
                    ].map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current time: {new Date().toLocaleTimeString("en-GB", { timeZone: selectedTimezone, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <Button variant="destructive" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" /> {t.signOut}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SECURITY TAB */}
        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display flex items-center gap-2">
                <Shield className="h-4 w-4" /> {t.changePassword}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>{t.newPassword}</Label>
                <Input type="password" value={passwordForm.password} onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{t.confirmPassword}</Label>
                <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} />
              </div>
              <Button onClick={updatePassword} variant="outline">{t.updatePassword}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB — Clients only */}
        {!isStaff && (
          <TabsContent value="documents" className="space-y-4 mt-4">
            <KycUpload />
          </TabsContent>
        )}

        {/* STATUSES TAB — Staff */}
        {isAdmin && (
          <TabsContent value="statuses" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Tag className="h-4 w-4" /> Lead / Depositor Statuses
                </CardTitle>
                <Button size="sm" onClick={() => openStatusDialog()}>
                  <Plus className="h-4 w-4 mr-1" /> Add Status
                </Button>
              </CardHeader>
              <CardContent>
                {statuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No statuses configured.</p>
                ) : (
                  <div className="space-y-2">
                    {statuses.map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg border">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.name}</span>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openStatusDialog(s)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteStatus(s.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}


        {/* LOCALIZATION TAB — Admin */}
        {isAdmin && (
          <TabsContent value="localization" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Localization
                </CardTitle>
                <CardDescription>Set default currency, language, and timezone</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1">
                  <Label>Default Currency</Label>
                  <Select
                    value={platformSettings.localization?.default_currency ?? "EUR"}
                    onValueChange={(v) => updateSettingField("localization", "default_currency", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["EUR", "USD", "GBP", "CHF", "AUD", "CAD"].map(c => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Default Language</Label>
                  <Select
                    value={platformSettings.localization?.default_language ?? "en"}
                    onValueChange={(v) => updateSettingField("localization", "default_language", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="de">Deutsch</SelectItem>
                      <SelectItem value="fr">Français</SelectItem>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Timezone</Label>
                  <Select
                    value={platformSettings.localization?.timezone ?? "Europe/Berlin"}
                    onValueChange={(v) => updateSettingField("localization", "timezone", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Europe/Berlin", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney"].map(tz => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => savePlatformSetting("localization", platformSettings.localization)} disabled={settingsLoading}>
                  Save Localization
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* REGISTRATION TAB — Admin */}
        {isAdmin && (
          <TabsContent value="registration" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <UserCog className="h-4 w-4" /> Registration Controls
                </CardTitle>
                <CardDescription>Control who can register and what information is required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Registration Enabled</Label>
                    <p className="text-xs text-muted-foreground">Allow new users to sign up</p>
                  </div>
                  <Switch
                    checked={platformSettings.registration?.enabled ?? true}
                    onCheckedChange={(v) => updateSettingField("registration", "enabled", v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Phone Number</Label>
                    <p className="text-xs text-muted-foreground">Phone number is mandatory during signup</p>
                  </div>
                  <Switch
                    checked={platformSettings.registration?.require_phone ?? true}
                    onCheckedChange={(v) => updateSettingField("registration", "require_phone", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Require Country</Label>
                    <p className="text-xs text-muted-foreground">Country selection is mandatory during signup</p>
                  </div>
                  <Switch
                    checked={platformSettings.registration?.require_country ?? true}
                    onCheckedChange={(v) => updateSettingField("registration", "require_country", v)}
                  />
                </div>
                <Separator />
                <div className="space-y-1">
                  <Label>Blocked Countries</Label>
                  <Textarea
                    value={(platformSettings.registration?.blocked_countries ?? []).join(", ")}
                    onChange={(e) => updateSettingField("registration", "blocked_countries", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                    placeholder="US, UK, CA (comma separated)"
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground">Users from these countries cannot register</p>
                </div>
                <Button onClick={() => savePlatformSetting("registration", platformSettings.registration)} disabled={settingsLoading}>
                  Save Registration Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* AUTH & SECURITY TAB — Admin */}
        {isAdmin && (
          <TabsContent value="auth-security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Authentication & Security
                </CardTitle>
                <CardDescription>Configure session timeouts, login attempts, and lockout policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={platformSettings.security?.session_timeout_minutes ?? 60}
                      onChange={(e) => updateSettingField("security", "session_timeout_minutes", parseInt(e.target.value) || 60)}
                    />
                    <p className="text-xs text-muted-foreground">Auto-logout after inactivity</p>
                  </div>
                  <div className="space-y-1">
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={platformSettings.security?.max_login_attempts ?? 5}
                      onChange={(e) => updateSettingField("security", "max_login_attempts", parseInt(e.target.value) || 5)}
                    />
                    <p className="text-xs text-muted-foreground">Before account lockout</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Lockout Duration (minutes)</Label>
                  <Input
                    type="number"
                    value={platformSettings.security?.lockout_duration_minutes ?? 15}
                    onChange={(e) => updateSettingField("security", "lockout_duration_minutes", parseInt(e.target.value) || 15)}
                  />
                  <p className="text-xs text-muted-foreground">How long the account stays locked after max attempts</p>
                </div>
                <Button onClick={() => savePlatformSetting("security", platformSettings.security)} disabled={settingsLoading}>
                  Save Security Settings
                </Button>
              </CardContent>
            </Card>

            {/* IP Whitelist for Backoffice */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Shield className="h-4 w-4" /> Backoffice IP Whitelist
                </CardTitle>
                <CardDescription>Restrict backoffice access to specific IP addresses. Only whitelisted IPs can access crm-crypto-boerse.com</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable IP Whitelist</Label>
                    <p className="text-xs text-muted-foreground">When enabled, only listed IPs can access the backoffice</p>
                  </div>
                  <Switch
                    checked={platformSettings.backoffice_ip_whitelist?.enabled ?? false}
                    onCheckedChange={(v) => {
                      setPlatformSettings(prev => ({
                        ...prev,
                        backoffice_ip_whitelist: { ...(prev.backoffice_ip_whitelist ?? { ips: [] }), enabled: v },
                      }));
                    }}
                  />
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label>Whitelisted IPs</Label>
                  {(platformSettings.backoffice_ip_whitelist?.ips ?? []).map((ip: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        value={ip}
                        onChange={(e) => {
                          const newIps = [...(platformSettings.backoffice_ip_whitelist?.ips ?? [])];
                          newIps[idx] = e.target.value;
                          setPlatformSettings(prev => ({
                            ...prev,
                            backoffice_ip_whitelist: { ...(prev.backoffice_ip_whitelist ?? {}), ips: newIps },
                          }));
                        }}
                        placeholder="e.g. 203.0.113.50"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive shrink-0"
                        onClick={() => {
                          const newIps = (platformSettings.backoffice_ip_whitelist?.ips ?? []).filter((_: string, i: number) => i !== idx);
                          setPlatformSettings(prev => ({
                            ...prev,
                            backoffice_ip_whitelist: { ...(prev.backoffice_ip_whitelist ?? {}), ips: newIps },
                          }));
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newIps = [...(platformSettings.backoffice_ip_whitelist?.ips ?? []), ""];
                      setPlatformSettings(prev => ({
                        ...prev,
                        backoffice_ip_whitelist: { ...(prev.backoffice_ip_whitelist ?? { enabled: false }), ips: newIps },
                      }));
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add IP
                  </Button>
                </div>
                <Button
                  onClick={() => {
                    const cleaned = {
                      ...platformSettings.backoffice_ip_whitelist,
                      ips: (platformSettings.backoffice_ip_whitelist?.ips ?? []).filter((ip: string) => ip.trim() !== ""),
                    };
                    savePlatformSetting("backoffice_ip_whitelist", cleaned);
                  }}
                  disabled={settingsLoading}
                >
                  Save IP Whitelist
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* NOTIFICATIONS TAB — Admin */}
        {isAdmin && (
          <TabsContent value="notifications" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Bell className="h-4 w-4" /> Notification Settings
                </CardTitle>
                <CardDescription>Control which events trigger notifications to users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Push Notifications</Label>
                    <p className="text-xs text-muted-foreground">Enable browser push notifications</p>
                  </div>
                  <Switch
                    checked={platformSettings.notifications?.push_enabled ?? false}
                    onCheckedChange={(v) => updateSettingField("notifications", "push_enabled", v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email on Deposit</Label>
                    <p className="text-xs text-muted-foreground">Notify users when their deposit is processed</p>
                  </div>
                  <Switch
                    checked={platformSettings.notifications?.email_on_deposit ?? true}
                    onCheckedChange={(v) => updateSettingField("notifications", "email_on_deposit", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email on Withdrawal</Label>
                    <p className="text-xs text-muted-foreground">Notify users when their withdrawal is processed</p>
                  </div>
                  <Switch
                    checked={platformSettings.notifications?.email_on_withdrawal ?? true}
                    onCheckedChange={(v) => updateSettingField("notifications", "email_on_withdrawal", v)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email on Login</Label>
                    <p className="text-xs text-muted-foreground">Notify users of new login activity</p>
                  </div>
                  <Switch
                    checked={platformSettings.notifications?.email_on_login ?? false}
                    onCheckedChange={(v) => updateSettingField("notifications", "email_on_login", v)}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>FTD Celebration Effects</Label>
                    <p className="text-xs text-muted-foreground">Show confetti animation and sound when a lead makes their first deposit</p>
                  </div>
                  <Switch
                    checked={platformSettings.notifications?.ftd_celebration ?? true}
                    onCheckedChange={(v) => updateSettingField("notifications", "ftd_celebration", v)}
                  />
                </div>
                <Button onClick={() => savePlatformSetting("notifications", platformSettings.notifications)} disabled={settingsLoading}>
                  Save Notification Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}


        {/* AUTO ASSIGN TAB — Admin */}
        {isAdmin && (
          <TabsContent value="auto-assign" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Users className="h-4 w-4" /> Auto Assign Settings
                </CardTitle>
                <CardDescription>Configure how new leads are automatically assigned to agents</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Default assignment mode */}
                <div className="space-y-2">
                  <Label>Default Assignment Mode</Label>
                  <Select
                    value={platformSettings.auto_assign?.mode ?? "none"}
                    onValueChange={(v) => updateSettingField("auto_assign", "mode", v)}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Auto Assign</SelectItem>
                      <SelectItem value="round_robin">Round Robin (rotate between agents)</SelectItem>
                      <SelectItem value="fixed">Fixed Agent (all leads to one agent)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">How leads without affiliate mapping are assigned</p>
                </div>

                {/* Fixed agent selection */}
                {platformSettings.auto_assign?.mode === "fixed" && (
                  <div className="space-y-2">
                    <Label>Default Agent</Label>
                    <Select
                      value={platformSettings.auto_assign?.default_agent ?? ""}
                      onValueChange={(v) => updateSettingField("auto_assign", "default_agent", v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select agent" /></SelectTrigger>
                      <SelectContent>
                        {agents.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Round robin agent pool */}
                {platformSettings.auto_assign?.mode === "round_robin" && (
                  <div className="space-y-2">
                    <Label>Agent Pool</Label>
                    <p className="text-xs text-muted-foreground">Select which agents participate in round-robin assignment</p>
                    <div className="space-y-2 border rounded-lg p-3">
                      {agents.map(a => {
                        const pool: string[] = platformSettings.auto_assign?.agent_pool ?? [];
                        const isInPool = pool.includes(a.id);
                        return (
                          <div key={a.id} className="flex items-center justify-between">
                            <span className="text-sm">{a.full_name || a.email}</span>
                            <Switch
                              checked={isInPool}
                              onCheckedChange={(checked) => {
                                const newPool = checked
                                  ? [...pool, a.id]
                                  : pool.filter((id: string) => id !== a.id);
                                updateSettingField("auto_assign", "agent_pool", newPool);
                              }}
                            />
                          </div>
                        );
                      })}
                      {agents.length === 0 && <p className="text-sm text-muted-foreground">No agents found</p>}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Affiliate → Agent mapping */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Affiliate → Agent Mapping</Label>
                    <p className="text-xs text-muted-foreground">Assign a specific agent for leads coming from each affiliate</p>
                  </div>
                  {affiliates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active affiliates</p>
                  ) : (
                    <div className="space-y-3 border rounded-lg p-3">
                      {affiliates.map(aff => {
                        const mapping: Record<string, string> = platformSettings.auto_assign?.affiliate_mapping ?? {};
                        return (
                          <div key={aff.id} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <Badge variant="outline" className="text-xs shrink-0">{aff.name}</Badge>
                            </div>
                            <Select
                              value={mapping[aff.id] ?? "default"}
                              onValueChange={(v) => {
                                const newMapping = { ...mapping };
                                if (v === "default") delete newMapping[aff.id];
                                else newMapping[aff.id] = v;
                                updateSettingField("auto_assign", "affiliate_mapping", newMapping);
                              }}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs">
                                <SelectValue placeholder="Use default" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="default">Use Default</SelectItem>
                                {agents.map(a => (
                                  <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Funnel → Agent mapping */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Funnel → Agent Mapping</Label>
                    <p className="text-xs text-muted-foreground">Assign agents based on registration funnel source</p>
                  </div>
                  <div className="space-y-2">
                    {(platformSettings.auto_assign?.funnel_rules ?? []).map((rule: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          className="h-8 text-xs flex-1"
                          placeholder="Funnel name"
                          value={rule.funnel ?? ""}
                          onChange={(e) => {
                            const rules = [...(platformSettings.auto_assign?.funnel_rules ?? [])];
                            rules[idx] = { ...rules[idx], funnel: e.target.value };
                            updateSettingField("auto_assign", "funnel_rules", rules);
                          }}
                        />
                        <Select
                          value={rule.agent_id ?? ""}
                          onValueChange={(v) => {
                            const rules = [...(platformSettings.auto_assign?.funnel_rules ?? [])];
                            rules[idx] = { ...rules[idx], agent_id: v };
                            updateSettingField("auto_assign", "funnel_rules", rules);
                          }}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => {
                            const rules = (platformSettings.auto_assign?.funnel_rules ?? []).filter((_: any, i: number) => i !== idx);
                            updateSettingField("auto_assign", "funnel_rules", rules);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const rules = [...(platformSettings.auto_assign?.funnel_rules ?? []), { funnel: "", agent_id: "" }];
                        updateSettingField("auto_assign", "funnel_rules", rules);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Funnel Rule
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Country → Agent mapping */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-semibold">Country → Agent Mapping</Label>
                    <p className="text-xs text-muted-foreground">Assign agents based on the lead's country</p>
                  </div>
                  <div className="space-y-2">
                    {(platformSettings.auto_assign?.country_rules ?? []).map((rule: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Select
                          value={rule.country ?? ""}
                          onValueChange={(v) => {
                            const rules = [...(platformSettings.auto_assign?.country_rules ?? [])];
                            rules[idx] = { ...rules[idx], country: v };
                            updateSettingField("auto_assign", "country_rules", rules);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Select country" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Germany","Austria","Switzerland","United Kingdom","France","Netherlands","Belgium","Italy","Spain","Sweden","Norway","Denmark","Poland","Ireland","Luxembourg","United States","Australia","Canada","Japan","Singapore","United Arab Emirates","Brazil","India"].map(c => (
                              <SelectItem key={c} value={c}>{c}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={rule.agent_id ?? ""}
                          onValueChange={(v) => {
                            const rules = [...(platformSettings.auto_assign?.country_rules ?? [])];
                            rules[idx] = { ...rules[idx], agent_id: v };
                            updateSettingField("auto_assign", "country_rules", rules);
                          }}
                        >
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue placeholder="Select agent" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.map(a => (
                              <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => {
                            const rules = (platformSettings.auto_assign?.country_rules ?? []).filter((_: any, i: number) => i !== idx);
                            updateSettingField("auto_assign", "country_rules", rules);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        const rules = [...(platformSettings.auto_assign?.country_rules ?? []), { country: "", agent_id: "" }];
                        updateSettingField("auto_assign", "country_rules", rules);
                      }}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Country Rule
                    </Button>
                  </div>
                </div>

                <Button onClick={() => savePlatformSetting("auto_assign", platformSettings.auto_assign)} disabled={settingsLoading}>
                  Save Auto Assign Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* ROLES TAB — Admin */}
        {isAdmin && (
          <TabsContent value="roles" className="mt-4">
            <RolesManager />
          </TabsContent>
        )}

        {/* ASSETS TAB — Admin */}
        {isAdmin && (
          <TabsContent value="assets" className="mt-4">
            <AssetsManager />
          </TabsContent>
        )}

        {/* PHONE PREFIXES TAB — Admin */}
        {isAdmin && (
          <TabsContent value="phone-prefixes" className="mt-4">
            <PhonePrefixesManager />
          </TabsContent>
        )}

        {/* PAYMENT LINKS TAB — Admin */}
        {isAdmin && (
          <TabsContent value="payment-links" className="mt-4">
            <PaymentLinksManager />
          </TabsContent>
        )}

        {/* TELEGRAM BOT TAB — Admin */}
        {isAdmin && (
          <TabsContent value="telegram-bot" className="mt-4">
            <TelegramBotManager />
          </TabsContent>
        )}

        {/* EMAIL LOG TAB — Admin */}
        {isAdmin && (
          <TabsContent value="email-log" className="mt-4">
            <EmailLogViewer />
          </TabsContent>
        )}

        {/* EMAIL FEATURES TAB — Admin */}
        {isAdmin && (
          <TabsContent value="email-features" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Email Features
                </CardTitle>
                <CardDescription>
                  Globally enable or disable email sending and inbound replies.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">Outbound emails</Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, no transactional emails (custom, deposit, invitations, etc.) will be sent.
                    </p>
                  </div>
                  <Switch
                    checked={(platformSettings.email_features?.outbound_enabled ?? true) === true}
                    disabled={settingsLoading}
                    onCheckedChange={(checked) => {
                      const next = { ...(platformSettings.email_features ?? {}), outbound_enabled: checked };
                      savePlatformSetting("email_features", next);
                    }}
                  />
                </div>

                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-semibold">Inbound replies (client portal)</Label>
                    <p className="text-xs text-muted-foreground">
                      When disabled, clients can no longer reply via the secure /reply portal links.
                    </p>
                  </div>
                  <Switch
                    checked={(platformSettings.email_features?.inbound_enabled ?? true) === true}
                    disabled={settingsLoading}
                    onCheckedChange={(checked) => {
                      const next = { ...(platformSettings.email_features ?? {}), inbound_enabled: checked };
                      savePlatformSetting("email_features", next);
                    }}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Changes take effect immediately. Disabled outbound emails are logged as <span className="font-mono">failed</span> with reason "disabled by admin".
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        )}
        {isAdmin && (
          <TabsContent value="btc-pool" className="mt-4">
            <BtcAddressPoolManager />
          </TabsContent>
        )}
      </Tabs>

      {/* Status Create/Edit Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? "Edit Status" : "Create Status"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input value={statusForm.name} onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })} placeholder="e.g. Interested" />
            </div>
            <div className="space-y-1">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((c) => (
                  <button
                    key={c.value}
                    className={`text-xs px-3 py-2 rounded-lg font-medium border-2 transition-all ${c.value} ${statusForm.color === c.value ? "border-primary ring-1 ring-primary" : "border-transparent"}`}
                    onClick={() => setStatusForm({ ...statusForm, color: c.value })}
                    type="button"
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveStatus}>{editingStatus ? "Save" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Settings;
