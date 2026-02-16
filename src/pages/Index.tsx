import { useState } from "react";
import onflyLogo from "@/assets/onfly-logo.png";
import { Aircraft, CargoPart } from "@/data/aircraft";
import StepIndicator from "@/components/cargo/StepIndicator";
import AircraftSelect from "@/components/cargo/AircraftSelect";
import CargoList from "@/components/cargo/CargoList";
import MechanicsConfig from "@/components/cargo/MechanicsConfig";
import PayloadCheck from "@/components/cargo/PayloadCheck";
import FitChecks from "@/components/cargo/FitChecks";
import Visualizations from "@/components/cargo/Visualizations";
import SummaryDashboard from "@/components/cargo/SummaryDashboard";

const STEPS = ["Aircraft", "Cargo", "Options", "Payload", "Fit Checks", "Visualize"];

const Index = () => {
  const [aircraft, setAircraft] = useState<Aircraft | null>(null);
  const [parts, setParts] = useState<CargoPart[]>([]);
  const [includeMechanics, setIncludeMechanics] = useState(false);
  const [mechanicCount, setMechanicCount] = useState(0);
  const [toolWeight, setToolWeight] = useState(0);
  const [removeSeats, setRemoveSeats] = useState(false);

  const currentStep = !aircraft ? 0 : parts.length === 0 ? 1 : 5;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card card-shadow sticky top-0 z-40">
        <div className="container max-w-5xl mx-auto flex items-center justify-between py-3 px-4">
          <div className="flex items-center gap-2">
            <img src={onflyLogo} alt="OnFly Airlines" className="w-10 h-10 object-contain" />
            <div>
              <h1 className="text-base font-bold tracking-tight">OnFly Airlines</h1>
              <p className="text-[10px] text-muted-foreground leading-tight">Air Cargo Fit Tool</p>
            </div>
          </div>
          <StepIndicator steps={STEPS} currentStep={currentStep} />
        </div>
      </header>

      {/* Main content */}
      <main className="container max-w-5xl mx-auto px-4 py-6 space-y-5">
        <AircraftSelect selected={aircraft} onSelect={setAircraft} />

        {aircraft && (
          <>
            <CargoList parts={parts} setParts={setParts} />

            <MechanicsConfig
              aircraft={aircraft}
              includeMechanics={includeMechanics}
              setIncludeMechanics={setIncludeMechanics}
              mechanicCount={mechanicCount}
              setMechanicCount={setMechanicCount}
              toolWeight={toolWeight}
              setToolWeight={setToolWeight}
              removeSeats={removeSeats}
              setRemoveSeats={setRemoveSeats}
            />

            {parts.length > 0 && (
              <>
                <PayloadCheck
                  aircraft={aircraft}
                  parts={parts}
                  includeMechanics={includeMechanics}
                  mechanicCount={mechanicCount}
                  toolWeight={toolWeight}
                  removeSeats={removeSeats}
                />

                <FitChecks aircraft={aircraft} parts={parts} />

                <Visualizations aircraft={aircraft} parts={parts} />

                <SummaryDashboard
                  aircraft={aircraft}
                  parts={parts}
                  includeMechanics={includeMechanics}
                  mechanicCount={mechanicCount}
                  toolWeight={toolWeight}
                  removeSeats={removeSeats}
                />
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} OnFly Airlines — Air Cargo Fit Tool
      </footer>
    </div>
  );
};

export default Index;
