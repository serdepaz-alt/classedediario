interface GradeBarChartProps {
  grades: number[];
  color: "success" | "warning" | "destructive";
}

export const GradeBarChart = ({ grades, color }: GradeBarChartProps) => {
  const colorClasses = {
    success: "bg-success",
    warning: "bg-warning", 
    destructive: "bg-destructive"
  };

  const maxGrade = 10;

  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {grades.map((grade, index) => {
        const heightPercent = (grade / maxGrade) * 100;
        
        return (
          <div
            key={index}
            className={`w-3 rounded-t-sm ${colorClasses[color]} transition-all duration-200 hover:opacity-80`}
            style={{ height: `${heightPercent}%` }}
            title={`A${index + 1}: ${grade.toFixed(1)}`}
          />
        );
      })}
    </div>
  );
};
