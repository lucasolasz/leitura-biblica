interface ProgressBarProps {
  label: string;
  completed: number;
  total: number;
  percentage: number;
  colorClass: string; // Ex: "blue", "pink", "green", "amber"
}

const ProgressBar = ({
  label,
  completed,
  total,
  percentage,
  colorClass,
}: ProgressBarProps) => {
  const colors: Record<string, string> = {
    blue: "text-blue-700 bg-blue-100 bg-blue-500",
    pink: "text-pink-700 bg-pink-100 bg-pink-500",
    green: "text-green-700 bg-green-100 bg-green-500",
    amber: "text-amber-700 bg-amber-100 bg-amber-500",
  };
  return (
    <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm shadow-sm border-b border-neutral-200 px-4 py-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-neutral-800">
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
                {yellowCompleted} / {totalDays} ({yellowPercentage.toFixed(1)}%)
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
  );
};

export { ProgressBar };
