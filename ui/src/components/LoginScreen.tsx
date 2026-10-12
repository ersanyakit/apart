"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Building2,
  ChevronRight,
  Search,
  Plus,
  Hotel,
  ArrowLeft,
  User,
  ShieldCheck,
  Key,
  Star,
} from "lucide-react";

import { command, messageOf, contracts, type Selection } from "../lib/api";
import { ErrorMessage } from "./FormKit";

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
    <div className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-4 md:p-8 font-sans overflow-hidden relative">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-red-500/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl grid md:grid-cols-12 bg-white rounded-[40px] shadow-2xl shadow-slate-200/50 overflow-hidden relative z-10 border border-white"
      >
        {/* Left Side: Illustration / Branding */}
        <div className="md:col-span-5 bg-brand-blue-600 p-8 md:p-12 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-slate-900/10 rounded-full -ml-32 -mb-32 blur-3xl opacity-50" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.05)_50%,rgba(255,255,255,0.05)_75%,transparent_75%,transparent)] bg-[length:20px_20px] opacity-10" />
          </div>

          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center mb-6 border border-white/30 shadow-2xl">
              <Hotel className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tighter leading-tight uppercase">
              interaktif <br />{" "}
              <span className="text-red-400">OTEL PROGRAMI</span>
            </h1>
            <p className="mt-4 text-white/70 text-sm font-medium leading-relaxed max-w-xs">
              Yeni nesil interaktif yönetim sistemi ile tüm operasyonlarınızı
              tek bir ekran üzerinden yönetin.
            </p>
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/40">
                  GÜVENLİK
                </p>
                <p className="text-sm font-bold">Güvenli Oturum Yönetimi</p>
              </div>
            </div>
            <div className="pt-8 flex items-baseline gap-1 text-white/30 font-black">
              <span className="text-xs uppercase tracking-[0.2em]">VER</span>
              <span className="text-lg">{contracts.application_version}</span>
            </div>
          </div>
        </div>

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
                  {step === "hotel" && "Otel Seçimi"}
                  {step === "user" && "Kullanıcı Seçimi"}
                  {step === "password" && "Oturum Aç"}
                  {step === "register" && "Yeni Otel Kaydı"}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mt-1">
                  {step === "hotel" && "Lütfen sistemdeki tesisinizi seçin"}
                  {step === "user" && selectedHotel?.name}
                  {step === "password" && selectedUser?.name}
                  {step === "register" && "Tesisinizi sisteme tanımlayın"}
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
                <Plus className="w-3.5 h-3.5" />
                YENİ KAYIT
              </button>
            )}
          </div>

          <ErrorMessage message={error} />
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {step === "hotel" && (
                <motion.div
                  key="step-hotel"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex flex-col h-full"
                >
                  <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input
                      type="text"
                      placeholder="OTELİNİZİN ADI VEYA LOKASYONU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="uni-input w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 transition-all uppercase tracking-widest placeholder:text-slate-300"
                    />
                  </div>

                  <div className="flex-1 overflow-y-auto no-scrollbar space-y-3 pr-2">
                    {loading && (
                      <p className="text-xs text-slate-400 p-4">
                        Tesisler yükleniyor…
                      </p>
                    )}
                    {filteredHotels.map((hotel) => (
                      <motion.button
                        key={hotel.id}
                        onClick={() => handleHotelSelect(hotel)}
                        className="uni-control w-full flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-3xl hover:border-brand-blue-400    group shadow-sm    cursor-pointer"
                      >
                        <div className="w-full flex items-center gap-4">
                          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-600 group-hover:text-white transition-all shadow-inner shrink-0 relative overflow-hidden">
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
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-brand-blue-600 group-hover:text-white transition-all duration-150 ease-out">
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
                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                          OTEL BULUNAMADI
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {step === "user" && selectedHotel && (
                <motion.div
                  key="step-user"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pb-4"
                >
                  {peopleLoading && (
                    <p className="col-span-full text-xs text-slate-400">
                      Personel yükleniyor…
                    </p>
                  )}
                  {people.map((person) => (
                    <motion.button
                      key={person.user_id}
                      onClick={() => handleUserSelect(person)}
                      className="uni-control flex flex-col items-center gap-4 p-6 bg-white border border-slate-200 rounded-[32px] hover:border-brand-blue-400    group shadow-sm    cursor-pointer"
                    >
                      <div className="w-16 h-16 bg-slate-100 rounded-[24px] flex items-center justify-center text-slate-400 group-hover:bg-brand-blue-600 group-hover:text-white transition-all">
                        <User className="w-8 h-8" />
                      </div>
                      <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {person.name}
                      </span>
                    </motion.button>
                  ))}
                  {!peopleLoading && people.length === 0 && (
                    <p className="col-span-full text-xs text-slate-400 py-4">
                      Bu tesis için henüz personel tanımlanmamış.
                    </p>
                  )}
                  <details className="col-span-full mt-4">
                    <summary className="cursor-pointer text-xs font-bold text-slate-400 hover:text-brand-blue-600 py-2">
                      Diğer hesapla giriş
                    </summary>
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
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kullanıcı adı veya e-posta
                        <input
                          required
                          autoComplete="username"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          className="uni-input mt-3 w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:border-brand-blue-500"
                        />
                      </label>
                      <button className="uni-control w-full py-4 uni-button-primary   text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100     cursor-pointer">
                        DEVAM ET
                      </button>
                    </form>
                  </details>
                </motion.div>
              )}

              {step === "password" && selectedUser && (
                <motion.div
                  key="step-password"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="flex flex-col items-center pt-8"
                >
                  <div className="w-24 h-24 bg-brand-blue-600 rounded-[32px] flex items-center justify-center text-white mb-6 shadow-2xl shadow-brand-blue-100 border-4 border-white">
                    <User className="w-12 h-12" />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    {selectedUser.name}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1 mb-10">
                    {selectedUser.role ? `${selectedUser.role} / ` : ""}
                    {selectedHotel?.name}
                  </p>

                  <form
                    onSubmit={handleLogin}
                    className="w-full max-w-sm space-y-4"
                  >
                    <div className="relative group">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-brand-blue-500 transition-all duration-150 ease-out" />
                      <input
                        autoFocus
                        type="password"
                        autoComplete="current-password"
                        aria-label="Şifre"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="uni-input w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-800 outline-none focus:ring-4 focus:ring-brand-blue-500/5 focus:border-brand-blue-500 transition-all placeholder:text-slate-200"
                      />
                    </div>
                    <motion.button
                      type="submit"
                      disabled={busy}
                      className="uni-control w-full py-4 uni-button-primary   text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100     cursor-pointer disabled:cursor-not-allowed"
                    >
                      {busy ? "GİRİŞ YAPILIYOR…" : "SİSTEME GİRİŞ YAP"}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {step === "register" && (
                <motion.div
                  key="step-register"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4 pt-2"
                >
                  <form onSubmit={handleLogin} className="space-y-4">
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Yeni otel kaydı için yönetici hesabınızla giriş yapın.
                      Ardından tesis bilgilerini doldurabilirsiniz.
                    </p>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Kullanıcı adı
                      <input
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="uni-input mt-2 w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
                      />
                    </label>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Şifre
                      <input
                        required
                        type="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="uni-input mt-2 w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-700"
                      />
                    </label>
                    <button
                      disabled={busy}
                      className="uni-control w-full py-4 uni-button-primary text-white rounded-2xl text-xs   tracking-[0.2em]  shadow-brand-blue-100"
                    >
                      GİRİŞ YAP VE TESİS EKLE
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Branding */}
          <div className="pt-10 flex items-center justify-between border-t border-slate-100 mt-auto">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-[10px] font-black">
                OK
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Okan Yazılım A.Ş.
              </span>
            </div>
            <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
              interaktifotel.com
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
