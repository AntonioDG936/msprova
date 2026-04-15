import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Keypad } from "@/components/Keypad";
import { toast } from "sonner";
import { StaffDashboard } from "@/components/staff/StaffDashboard";

const STAFF_PIN = "0891";

const Staff = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    const staffAuth = localStorage.getItem("paestum_staff_auth");
    if (staffAuth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (pin.length === 4) {
      if (pin === STAFF_PIN) {
        setIsAuthenticated(true);
        localStorage.setItem("paestum_staff_auth", "true");
        toast.success("Accesso effettuato!");
      } else {
        toast.error("Codice non valido");
        setPin("");
      }
    }
  }, [pin]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-sm bg-card/80 backdrop-blur-sm border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
              Torneo di Paestum
            </CardTitle>
            <p className="text-accent text-sm sm:text-base">Area Staff</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-center gap-2 sm:gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg border-2 border-primary/50 flex items-center justify-center bg-primary/5">
                  {pin[i] ? <div className="w-3 h-3 rounded-full bg-primary" /> : null}
                </div>
              ))}
            </div>
            <Keypad value={pin} onChange={setPin} />
          </CardContent>
        </Card>
      </div>
    );
  }

  return <StaffDashboard />;
};

export default Staff;
