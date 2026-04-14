import { Delete } from "lucide-react";
import { Button } from "@/components/ui/button";

interface KeypadProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
}

export const Keypad = ({ value, onChange, maxLength = 4 }: KeypadProps) => {
  const handleNumber = (num: string) => {
    if (value.length < maxLength) {
      onChange(value + num);
    }
  };

  const handleDelete = () => {
    onChange(value.slice(0, -1));
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
        <Button
          key={num}
          onClick={() => handleNumber(num)}
          variant="outline"
          className="h-12 sm:h-14 text-lg sm:text-xl font-semibold bg-primary/10 hover:bg-primary/20 border-primary/30 text-foreground"
        >
          {num}
        </Button>
      ))}
      <div />
      <Button
        onClick={() => handleNumber("0")}
        variant="outline"
        className="h-12 sm:h-14 text-lg sm:text-xl font-semibold bg-primary/10 hover:bg-primary/20 border-primary/30 text-foreground"
      >
        0
      </Button>
      <Button
        onClick={handleDelete}
        variant="outline"
        className="h-12 sm:h-14 bg-destructive/10 hover:bg-destructive/20 border-destructive/30"
      >
        <Delete className="w-4 h-4 sm:w-5 sm:h-5 text-destructive-foreground" />
      </Button>
    </div>
  );
};
