"use client";

import { useState, useEffect, useMemo } from "react";
import planData from "@/data/plan.json";
import {
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Target,
  EyeOff,
  Eye,
} from "lucide-react";
import { db } from "@/firebase";
import {
  doc,
  onSnapshot,
  setDoc,
  getDoc,
  updateDoc,
  FieldPath,
} from "firebase/firestore";
import Image from "next/image";

type PlanEntry = {
  date: string;
  reading: string;
  year: number;
};

type ProgressState = {
  [key: string]: {
    blue?: boolean;
    pink?: boolean;
    green?: boolean;
    yellow?: boolean;
  };
};

type MonthGroup = {
  month: string;
  entries: PlanEntry[];
};

export default function Home() {
  const [progress, setProgress] = useState<ProgressState>({});
  const [loadingData, setLoadingData] = useState(true);

  // UI States
  const [activeYear, setActiveYear] = useState<number>(1);
  const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>(
    {},
  );
  const [hideCompleted, setHideCompleted] = useState(false);
  const [initialScrollDone, setInitialScrollDone] = useState(false);

  // Group data by year and month
  const groupedPlan = useMemo(() => {
    const groups: Record<number, MonthGroup[]> = { 1: [], 2: [] };

    planData.forEach((entry) => {
      // Extract month from date (e.g., "01/Jan" -> "Jan")
      const month = entry.date.split("/")[1] || "Desconhecido";
      const year = entry.year;

      const yearGroups = groups[year];
      let lastGroup = yearGroups[yearGroups.length - 1];

      if (!lastGroup || lastGroup.month !== month) {
        yearGroups.push({ month, entries: [] });
        lastGroup = yearGroups[yearGroups.length - 1];
      }

      lastGroup.entries.push(entry);
    });

    return groups;
  }, []);

  useEffect(() => {
    if (!db) {
      console.warn(
        "Firebase is not initialized. Please configure environment variables.",
      );
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const docRef = doc(db, "progress", "shared");

    // Anexa um listener para atualizações em tempo real.
    // Isso também servirá dados do cache quando estiver offline.
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Define o progresso a partir do snapshot, usando um objeto vazio como fallback se 'checks' não existir
          setProgress(data.checks || {});
        }
        // Se o snapshot não existir, não fazemos nada aqui.
        // A chamada getDoc() abaixo cuidará da inicialização segura.
        setLoadingData(false);
      },
      (error) => {
        console.error("Erro no listener do Firestore: ", error);
        setLoadingData(false);
      },
    );

    // Separadamente, verifica a existência do documento para realizar uma inicialização segura e única.
    // getDoc() tenta buscar do servidor e falhará se estiver offline, prevenindo a escrita perigosa.
    getDoc(docRef)
      .then((snapshot) => {
        if (!snapshot.exists()) {
          // O documento realmente não existe no servidor, então podemos criá-lo com segurança.
          console.log(
            "Documento não encontrado. Inicializando progresso 'shared'...",
          );
          setDoc(docRef, { checks: {} });
        }
      })
      .catch((error) => {
        // Este erro é esperado quando offline. Não precisamos fazer nada.
        console.warn(
          "Não foi possível verificar a existência do documento, possivelmente offline.",
        );
      });

    return () => unsubscribe();
  }, []);

  // Auto-expand the current month based on progress
  useEffect(() => {
    if (loadingData || initialScrollDone) return;

    let foundUncompleted = false;
    for (const entry of planData) {
      const key = `${entry.date}-${entry.year}`;
      const p = progress[key] || {};

      if (!p.blue || !p.pink || !p.green || !p.yellow) {
        const month = entry.date.split("/")[1];
        const yearMonthKey = `${entry.year}-${month}`;

        setActiveYear(entry.year);
        setExpandedMonths((prev) => ({ ...prev, [yearMonthKey]: true }));
        foundUncompleted = true;
        break;
      }
    }

    // If everything is completed or no progress yet, just expand the first month of year 1
    if (!foundUncompleted) {
      const firstMonth = planData[0].date.split("/")[1];
      setExpandedMonths({ [`1-${firstMonth}`]: true });
    }

    setInitialScrollDone(true);
  }, [loadingData, progress, initialScrollDone]);

  const toggleCheck = async (
    key: string,
    color: "blue" | "pink" | "green" | "yellow",
  ) => {
    if (!db) {
      console.warn("Firebase is not initialized.");
      return;
    }

    // Optimistic update
    const newValue = !progress[key]?.[color];
    setProgress((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [color]: newValue,
      },
    }));

    try {
      const docRef = doc(db, "progress", "shared");
      // Usa updateDoc com FieldPath para garantir atualização atômica de chaves com caracteres especiais (como '/')
      await updateDoc(docRef, new FieldPath("checks", key, color), newValue);
    } catch (error: any) {
      // Se o documento ainda não existir, o updateDoc falhará. Neste caso, o criamos com setDoc com segurança.
      if (
        error?.code === "not-found" ||
        error?.message?.includes("No document to update")
      ) {
        const docRef = doc(db, "progress", "shared");
        await setDoc(
          docRef,
          { checks: { [key]: { [color]: newValue } } },
          { merge: true },
        );
      } else {
        console.error("Failed to update progress", error);
        // Revert optimistic update on error
        setProgress((prev) => ({
          ...prev,
          [key]: {
            ...prev[key],
            [color]: !newValue,
          },
        }));
      }
    }
  };

  const toggleMonth = (yearMonthKey: string) => {
    setExpandedMonths((prev) => ({
      ...prev,
      [yearMonthKey]: !prev[yearMonthKey],
    }));
  };

  const jumpToCurrent = () => {
    for (const entry of planData) {
      const key = `${entry.date}-${entry.year}`;
      const p = progress[key] || {};

      if (!p.blue || !p.pink || !p.green || !p.yellow) {
        const month = entry.date.split("/")[1];
        const yearMonthKey = `${entry.year}-${month}`;

        setActiveYear(entry.year);
        setExpandedMonths((prev) => ({ ...prev, [yearMonthKey]: true }));

        // Small delay to allow DOM to render the expanded accordion
        setTimeout(() => {
          const element = document.getElementById(`day-${key}`);
          if (element) {
            // Calculate offset to account for sticky header
            const headerOffset = 220;
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition =
              elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
              top: offsetPosition,
              behavior: "smooth",
            });
          }
        }, 100);
        break;
      }
    }
  };

  const totalDays = planData.length;
  const blueCompleted = Object.values(progress).filter((p) => p.blue).length;
  const pinkCompleted = Object.values(progress).filter((p) => p.pink).length;
  const greenCompleted = Object.values(progress).filter((p) => p.green).length;
  const yellowCompleted = Object.values(progress).filter(
    (p) => p.yellow,
  ).length;

  const bluePercentage =
    totalDays === 0 ? 0 : (blueCompleted / totalDays) * 100;
  const pinkPercentage =
    totalDays === 0 ? 0 : (pinkCompleted / totalDays) * 100;
  const greenPercentage =
    totalDays === 0 ? 0 : (greenCompleted / totalDays) * 100;
  const yellowPercentage =
    totalDays === 0 ? 0 : (yellowCompleted / totalDays) * 100;

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-24">
      {/* Sticky Header with Progress Bars */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm border-b border-neutral-200 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-neutral-800 flex gap-3 items-center">
              <span>
                <Image src="/logo.png" alt="Logo" width={32} height={32} />
              </span>
              Plano de Leitura Bíblica
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setHideCompleted(!hideCompleted)}
                className={`p-2 rounded-full transition-colors ${
                  hideCompleted
                    ? "bg-neutral-800 text-white"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
                title={
                  hideCompleted ? "Mostrar concluídos" : "Ocultar concluídos"
                }
              >
                {hideCompleted ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                onClick={jumpToCurrent}
                className="p-2 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                title="Ir para o dia atual"
              >
                <Target size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
            {/* Blue Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-blue-700">
                <span>Lucas</span>
                <span>
                  {blueCompleted} / {totalDays} ({bluePercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-blue-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${bluePercentage}%` }}
                />
              </div>
            </div>

            {/* Pink Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-pink-700">
                <span>Victoria</span>
                <span>
                  {pinkCompleted} / {totalDays} ({pinkPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-pink-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 transition-all duration-500 ease-out"
                  style={{ width: `${pinkPercentage}%` }}
                />
              </div>
            </div>

            {/* Green Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-green-700">
                <span>Marcos</span>
                <span>
                  {greenCompleted} / {totalDays} ({greenPercentage.toFixed(1)}%)
                </span>
              </div>
              <div className="h-2 w-full bg-green-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500 ease-out"
                  style={{ width: `${greenPercentage}%` }}
                />
              </div>
            </div>

            {/* Yellow Progress */}
            <div>
              <div className="flex justify-between text-xs font-medium mb-1 text-amber-700">
                <span>Luciene</span>
                <span>
                  {yellowCompleted} / {totalDays} ({yellowPercentage.toFixed(1)}
                  %)
                </span>
              </div>
              <div className="h-2 w-full bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 transition-all duration-500 ease-out"
                  style={{ width: `${yellowPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {loadingData ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-neutral-400" size={32} />
          </div>
        ) : (
          <>
            {/* Year Tabs */}
            <div className="flex p-1 bg-neutral-200/50 rounded-xl mb-6">
              <button
                onClick={() => setActiveYear(1)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeYear === 1
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                1º Ano
              </button>
              <button
                onClick={() => setActiveYear(2)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  activeYear === 2
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                2º Ano
              </button>
            </div>

            {/* Months Accordion */}
            <div className="space-y-4">
              {groupedPlan[activeYear].map((monthGroup) => {
                const yearMonthKey = `${activeYear}-${monthGroup.month}`;
                const isExpanded = expandedMonths[yearMonthKey];

                // Calculate month progress
                const monthTotal = monthGroup.entries.length;
                let monthBlueCompleted = 0;
                let monthPinkCompleted = 0;
                let monthGreenCompleted = 0;
                let monthYellowCompleted = 0;

                monthGroup.entries.forEach((entry) => {
                  const key = `${entry.date}-${entry.year}`;
                  if (progress[key]?.blue) monthBlueCompleted++;
                  if (progress[key]?.pink) monthPinkCompleted++;
                  if (progress[key]?.green) monthGreenCompleted++;
                  if (progress[key]?.yellow) monthYellowCompleted++;
                });

                const isMonthFullyCompleted =
                  monthBlueCompleted === monthTotal &&
                  monthPinkCompleted === monthTotal &&
                  monthGreenCompleted === monthTotal &&
                  monthYellowCompleted === monthTotal;

                // If hide completed is active and this month is fully completed, hide the whole month card
                if (hideCompleted && isMonthFullyCompleted) {
                  return null;
                }

                return (
                  <div
                    key={yearMonthKey}
                    className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden"
                  >
                    {/* Month Header (Accordion Toggle) */}
                    <button
                      onClick={() => toggleMonth(yearMonthKey)}
                      className="w-full flex items-start sm:items-center justify-between p-4 sm:p-5 bg-white hover:bg-neutral-50 transition-colors text-left"
                    >
                      <div className="flex-1 pr-4">
                        <h2 className="text-lg font-bold text-neutral-800 capitalize">
                          {monthGroup.month}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs font-medium">
                          <span className="text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                            Lucas: {monthBlueCompleted}/{monthTotal}
                          </span>
                          <span className="text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-md">
                            Victoria: {monthPinkCompleted}/{monthTotal}
                          </span>
                          <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md">
                            Marcos: {monthGreenCompleted}/{monthTotal}
                          </span>
                          <span className="text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                            Luciene: {monthYellowCompleted}/{monthTotal}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`p-2 shrink-0 rounded-full transition-transform duration-200 ${isExpanded ? "bg-neutral-100" : ""}`}
                      >
                        {isExpanded ? (
                          <ChevronUp className="text-neutral-500" size={20} />
                        ) : (
                          <ChevronDown className="text-neutral-500" size={20} />
                        )}
                      </div>
                    </button>

                    {/* Month Entries */}
                    {isExpanded && (
                      <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
                        {monthGroup.entries.map((entry) => {
                          const key = `${entry.date}-${entry.year}`;
                          const isBlueChecked = progress[key]?.blue || false;
                          const isPinkChecked = progress[key]?.pink || false;
                          const isGreenChecked = progress[key]?.green || false;
                          const isYellowChecked =
                            progress[key]?.yellow || false;
                          const isFullyChecked =
                            isBlueChecked &&
                            isPinkChecked &&
                            isGreenChecked &&
                            isYellowChecked;

                          // Hide individual completed days if toggle is active
                          if (hideCompleted && isFullyChecked) {
                            return null;
                          }

                          return (
                            <li
                              key={key}
                              id={`day-${key}`}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-5 gap-3 transition-colors ${
                                isFullyChecked
                                  ? "bg-neutral-50/50"
                                  : "hover:bg-neutral-50"
                              }`}
                            >
                              <div className="flex items-center gap-3 sm:gap-4 flex-1 pr-4">
                                <span
                                  className={`text-sm font-medium w-14 shrink-0 ${isFullyChecked ? "text-neutral-400" : "text-neutral-500"}`}
                                >
                                  {entry.date}
                                </span>
                                <span
                                  className={`text-base font-semibold ${isFullyChecked ? "text-neutral-400 line-through decoration-neutral-300" : "text-neutral-800"}`}
                                >
                                  {entry.reading}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-end sm:self-auto">
                                <button
                                  onClick={() => toggleCheck(key, "blue")}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                    isBlueChecked
                                      ? "bg-blue-500 text-white shadow-md shadow-blue-200"
                                      : "bg-blue-50 text-blue-300 border-2 border-blue-100 hover:border-blue-300 hover:bg-blue-100"
                                  }`}
                                  title="Lucas"
                                  aria-label="Marcar leitura (Lucas)"
                                >
                                  <Check
                                    strokeWidth={isBlueChecked ? 3 : 2}
                                    size={18}
                                  />
                                </button>

                                <button
                                  onClick={() => toggleCheck(key, "pink")}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                    isPinkChecked
                                      ? "bg-pink-500 text-white shadow-md shadow-pink-200"
                                      : "bg-pink-50 text-pink-300 border-2 border-pink-100 hover:border-pink-300 hover:bg-pink-100"
                                  }`}
                                  title="Victoria"
                                  aria-label="Marcar leitura (Victoria)"
                                >
                                  <Check
                                    strokeWidth={isPinkChecked ? 3 : 2}
                                    size={18}
                                  />
                                </button>

                                <button
                                  onClick={() => toggleCheck(key, "green")}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                    isGreenChecked
                                      ? "bg-green-500 text-white shadow-md shadow-green-200"
                                      : "bg-green-50 text-green-300 border-2 border-green-100 hover:border-green-300 hover:bg-green-100"
                                  }`}
                                  title="Marcos"
                                  aria-label="Marcar leitura (Marcos)"
                                >
                                  <Check
                                    strokeWidth={isGreenChecked ? 3 : 2}
                                    size={18}
                                  />
                                </button>

                                <button
                                  onClick={() => toggleCheck(key, "yellow")}
                                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all ${
                                    isYellowChecked
                                      ? "bg-amber-500 text-white shadow-md shadow-amber-200"
                                      : "bg-amber-50 text-amber-300 border-2 border-amber-100 hover:border-amber-300 hover:bg-amber-100"
                                  }`}
                                  title="Luciene"
                                  aria-label="Marcar leitura (Luciene)"
                                >
                                  <Check
                                    strokeWidth={isYellowChecked ? 3 : 2}
                                    size={18}
                                  />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
