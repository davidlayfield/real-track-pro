import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, AlertTriangle } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string | number;
  change?: {
    type: 'increase' | 'decrease';
    text: string;
  };
  alert?: string;
  className?: string;
};

export default function StatCard({ title, value, change, alert, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-4">
        <h3 className="text-sm font-medium text-secondary">{title}</h3>
        <p className="text-2xl font-semibold mt-1">{value}</p>
        
        {change && (
          <div className={`flex items-center text-xs mt-2 ${change.type === 'increase' ? 'text-success' : 'text-warning'}`}>
            {change.type === 'increase' ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDown className="h-3 w-3 mr-1" />
            )}
            <span>{change.text}</span>
          </div>
        )}
        
        {alert && (
          <div className="flex items-center text-xs text-error mt-2">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span>{alert}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
