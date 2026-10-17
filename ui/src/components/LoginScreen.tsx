"use client";
import { useI18n } from "./I18n";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  ChevronRight,
  Search,
  Plus,
  ArrowLeft,
  User,
  ShieldCheck,
  Key,
  Star,
} from "lucide-react";

import { command, messageOf, contracts, type Selection } from "../lib/api";
import { ErrorMessage } from "./FormKit";
import brandLogo from "../assets/brand/researchcave.svg";
import styles from "./LoginScreen.module.css";

function LoginInput({ label, icon, ...props }: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: React.ReactNode;
}) {
  return <label className={styles.inputLabel}>
    <span>{label}</span>
    <span className={styles.inputField}>
      <span className={styles.inputIcon} aria-hidden="true">{icon}</span>
      <input {...props} className={styles.input} />
    </span>
  </label>;
}

interface Hotel {
  id: string;
  name: string;
  location: string;
  stars: number;
  image?: string;
  users: Array<{ id: string; name: string; role: string; avatar?: string }>;
}

export const LoginScreen: React.FC<{
  onLogin: (selection?: Selection, register?: boolean) => Promise<void>;
}> = ({ onLogin }) => {
  const {m: _uiText, locale: _uiLocale} = useI18n();

  const [hotels, setHotels] = useState<
    (Hotel & { hotel_id: string; branch_id: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  useEffect(() => {
    let active = true;
    command<
      {
        hotel_id: string;
        branch_id: string;
        name: string;
        location: string;
        image: string;
      }[]
    >("auth.properties")
      .then((items) => {
        if (active)
          setHotels(
            items.map((h) => ({ ...h, id: h.branch_id, stars: 0, users: [] })),
          );
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const [step, setStep] = useState<"hotel" | "user" | "password" | "register">(
    "hotel",
  );
  const [selectedHotel, setSelectedHotel] = useState<
    (Hotel & { hotel_id: string; branch_id: string }) | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<{
    user_id?: string;
    name: string;
    role?: string;
  } | null>(null);
  const [people, setPeople] = useState<{ user_id: string; name: string }[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);
  useEffect(() => {
    if (!selectedHotel) return;
    let active = true;
    setPeople([]);
    setPeopleLoading(true);
    command<{ user_id: string; name: string }[]>("auth.people", {
      branch_id: selectedHotel.branch_id,
    })
      .then((items) => {
        if (active) setPeople(items);
      })
      .catch((e) => {
        if (active) setError(messageOf(e));
      })
      .finally(() => {
        if (active) setPeopleLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedHotel]);
  const [password, setPassword] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const handleHotelSelect = (
    hotel: Hotel & { hotel_id: string; branch_id: string },
  ) => {
    setSelectedHotel(hotel);
    setSelectedUser(null);
    setPassword("");
    setUsername("");
    setError("");
    setStep("user");
  };

  const handleUserSelect = (user: { user_id: string; name: string }) => {
    setPassword("");
    setUsername("");
    setError("");
    setSelectedUser(user);
    setStep("password");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const selection = selectedHotel
        ? {
            hotel_id: selectedHotel.hotel_id,
            branch_id: selectedHotel.branch_id,
          }
        : {};
      await command("auth.login", {
        ...(step !== "register" && selectedUser?.user_id
          ? { user_id: selectedUser.user_id }
          : { username }),
        password,
        ...selection,
      });
      await onLogin(selection, step === "register");
    } catch (e) {
      setError(messageOf(e));
    } finally {
      setBusy(false);
    }
  };

  const filteredHotels = hotels.filter(
    (h) =>
      h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.location.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className={styles.page}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-4xl grid md:grid-cols-12 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden relative z-10 border border-white"
      >
        <aside className={`${styles.brandPanel} md:col-span-5`} aria-label={_uiText("Otel yönetim sistemi")}>
          <picture className={styles.artwork}>
            <source media="(max-width: 767px)" srcSet="/images/auth/reception-small.avif" />
            <img
              src="/images/auth/reception.avif"
              alt=""
              width={960}
              height={1440}
              fetchPriority="high"
            />
          </picture>
          <div className={styles.brandCopy}>
            <h1>{_uiText("interaktif")}<br /><span>{_uiText("OTEL PROGRAMI")}</span></h1>
            <p>{_uiText("Yeni nesil interaktif yönetim sistemi ile tüm operasyonlarınızı tek bir ekran üzerinden yönetin.")}</p>
          </div>
          <div className={styles.brandFooter}>
            <div className={styles.security}>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>{_uiText("Güvenli Oturum Yönetimi")}</span>
            </div>
            <span className={styles.version}>{_uiText("VER")} {contracts.application_version}</span>
          </div>
        </aside>

        {/* Right Side: Flow Content */}
        <div className="md:col-span-7 p-6 md:p-10 flex flex-col h-[600px] md:h-[650px]">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              {step !== "hotel" && (
                <button
                  onClick={() => {
                    if (step === "user") setStep("hotel");
                    if (step === "password") setStep("user");
                    if (step === "register") setStep("hotel");
                  }}
                  className="uni-control p-2 hover:bg-slate-100 active:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900     cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {step === "hotel" && _uiText("Otel Seçimi")}
                  {step === "user" && _uiText("Kullanıcı Seçimi")}
                  {step === "password" && _uiText("Oturum Aç")}
                  {step === "register" && _uiText("Yeni Otel Kaydı")}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                  {step === "hotel" && _uiText("Lütfen sistemdeki tesisinizi seçin")}
                  {step === "user" && selectedHotel?.name}
                  {step === "password" && selectedUser?.name}
                  {step === "register" && _uiText("Tesisinizi sisteme tanımlayın")}
                </p>
              </div>
            </div>

            {step === "hotel" && (
              <button
                onClick={() => {
                  setStep("register");
                  setSelectedHotel(null);
                  setError("");
                }}
                className="uni-control flex items-center gap-2 px-3 py-2 bg-brand-blue-50 text-brand-blue-600 rounded-xl text-[10px]    hover:bg-brand-blue-100 active:bg-brand-blue-100    shadow-sm  cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />{_uiText("YENİ KAYIT")} </button>
            )}
          </div>

          <ErrorMessage message={error} />
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {step === "hotel" && (
                <motion.div
                  key="step-hotel"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full"
                >
                  <div className="mb-4">
                    <LoginInput label={_uiText("Otel ara")} icon={<Search size={21} strokeWidth={1.8} />}
                      type="search" placeholder={_uiText("Otel adı veya konum")} value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)} />
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                    {loading && (
                      <p className="text-xs text-slate-400 p-4">{_uiText("Tesisler yükleniyor…")} </p>
                    )}
                    {filteredHotels.map((hotel) => (
                      <motion.button
                        key={hotel.id}
                        onClick={() => handleHotelSelect(hotel)}
                        className={`${styles.selectionCard} uni-control w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-3xl hover:border-brand-blue-400    group shadow-sm    cursor-pointer`}
                      >
                        <div className="w-full flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-100 group-hover:text-brand-blue-600 transition-all shadow-inner shrink-0 relative overflow-hidden">
                            {hotel.image ? (
                              <img
                                src={hotel.image}
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Building2 className="w-7 h-7 relative z-10" />
                            )}
                          </div>
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <h3 className="text-sm font-black text-slate-800 tracking-tight leading-none truncate uppercase">
                                {hotel.name}
                              </h3>
                              <div className="flex gap-0.5 shrink-0">
                                {Array.from({ length: hotel.stars }).map(
                                  (_, i) => (
                                    <Star
                                      key={i}
                                      className="w-2 h-2 fill-amber-400 text-amber-400"
                                    />
                                  ),
                                )}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                              {hotel.location}
                            </p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-brand-blue-100 group-hover:text-brand-blue-600 transition-all duration-150 ease-out">
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        </div>
                      </motion.button>
                    ))}

                    {!loading && filteredHotels.length === 0 && (
                      <div className="py-20 flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-4">
                          <Search className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{_uiText("OTEL BULUNAMADI")} </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === "user" && selectedHotel && (
                <motion.div
                  key="step-user"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pb-4"
                >
                  {peopleLoading && (
                    <p className="col-span-full text-xs text-slate-400">{_uiText("Personel yükleniyor…")} </p>
                  )}
                  {people.map((person) => (
                    <motion.button
                      key={person.user_id}
                      onClick={() => handleUserSelect(person)}
                      className={`${styles.selectionCard} uni-control flex flex-col items-center gap-4 p-6 bg-white border border-slate-200 rounded-[32px] hover:border-brand-blue-400    group shadow-sm    cursor-pointer`}
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-100 group-hover:text-brand-blue-600 transition-all">
                        <User className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {person.name}
                      </span>
                    </motion.button>
                  ))}
                  {!peopleLoading && people.length === 0 && (
                    <p className="col-span-full text-xs text-slate-400 py-4">{_uiText("Bu tesis için henüz personel tanımlanmamış.")} </p>
                  )}
                  <details className="col-span-full mt-4">
                    <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-brand-blue-600 py-2">{_uiText("Diğer hesapla giriş")} </summary>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        setSelectedUser({
                          name: "Personel",
                          role: "Yetkili kullanıcı",
                        });
                        setStep("password");
                        setError("");
                      }}
                      className="col-span-full space-y-3 rounded-[24px] border border-slate-200 p-4"
                    >
                      <LoginInput label={_uiText("Kullanıcı adı veya e-posta")} icon={<User size={21} strokeWidth={1.8} />}
                          required
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)} />
                      <button className="uni-control w-full py-4 uni-button-primary   text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100     cursor-pointer">{_uiText("DEVAM ET")} </button>
                    </form>
                  </details>
                </motion.div>
              )}

              {step === "password" && selectedUser && (
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center pt-4"
                >
                  <div className="w-24 h-24 bg-brand-blue-100 rounded-[32px] flex items-center justify-center text-brand-blue-600 mb-6 shadow-2xl shadow-brand-blue-100 border-4 border-white">
                    <User className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {selectedUser.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-6">
                    {selectedUser.role ? _uiText("{value1} / ", {value1: String(selectedUser.role)}) : ""}
                    {selectedHotel?.name}
                  </p>

                  <form
                    onSubmit={handleLogin}
                    className="w-full max-w-sm space-y-4"
                  >
                    <LoginInput label={_uiText("Şifre")} icon={<Key size={21} strokeWidth={1.8} />}
                      autoFocus type="password" autoComplete="current-password" required
                      placeholder={_uiText("Şifrenizi girin")} value={password}
                      onChange={e => setPassword(e.target.value)} />
                    <motion.button
                      type="submit"
                      disabled={busy}
                      className="uni-control w-full py-4 uni-button-primary   text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100     cursor-pointer disabled:cursor-not-allowed"
                    >
                      {busy ? _uiText("GİRİŞ YAPILIYOR…") : _uiText("SİSTEME GİRİŞ YAP")}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {step === "register" && (
                <motion.div
                  key="step-register"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 pt-2"
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">{_uiText("Yeni otel kaydı için yönetici hesabınızla giriş yapın. Ardından tesis bilgilerini doldurabilirsiniz.")} </p>
                    <LoginInput label={_uiText("Kullanıcı adı")} icon={<User size={21} strokeWidth={1.8} />}
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} />
                    <LoginInput label={_uiText("Şifre")} icon={<Key size={21} strokeWidth={1.8} />}
                        required
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} />
                    <button
                      disabled={busy}
                      className="uni-control w-full py-4 uni-button-primary text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100"
                    >{_uiText("GİRİŞ YAP VE TESİS EKLE")} </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Branding */}
          <div className="mt-auto border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between">
            <a href={contracts.brandURL} target="_blank" rel="noopener noreferrer" className="uni-control flex min-h-11 items-center gap-2 rounded-lg px-1">
              <img src={brandLogo.src} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              <span className="text-xs font-semibold text-slate-500">
                {contracts.brandName}
              </span>
            </a>
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">{_uiText("interaktifotel.com")} </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
