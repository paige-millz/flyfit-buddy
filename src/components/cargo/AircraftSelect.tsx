import { Plane, DoorOpen, Maximize, Weight, Armchair } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Aircraft, AIRCRAFT_DB } from "@/data/aircraft";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface AircraftSelectProps {
  selected: Aircraft | null;
  onSelect: (a: Aircraft) => void;
}

const AircraftSelect = ({ selected, onSelect }: AircraftSelectProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Card className="card-shadow animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Plane className="w-5 h-5 text-primary" />
          Step 1: Select Aircraft
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between">
              {selected ? selected.name : "Search aircraft..."}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-popover z-50" align="start">
            <Command>
              <CommandInput placeholder="Search aircraft..." />
              <CommandList>
                <CommandEmpty>No aircraft found.</CommandEmpty>
                <CommandGroup>
                  {AIRCRAFT_DB.map((ac) => (
                    <CommandItem
                      key={ac.name}
                      value={ac.name}
                      onSelect={() => {
                        onSelect(ac);
                        setOpen(false);
                      }}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected?.name === ac.name ? "opacity-100" : "opacity-0")} />
                      {ac.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {selected && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <DoorOpen className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs text-muted-foreground">Door Opening</div>
                  <div className="font-bold text-sm">{selected.doorWidth}" × {selected.doorHeight}"</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Width × Height of cargo door</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <Maximize className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs text-muted-foreground">Cabin</div>
                  <div className="font-bold text-sm">{selected.cabinLength}" × {selected.cabinWidth}" × {selected.cabinHeight}"</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Cabin L × W × H</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <Weight className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs text-muted-foreground">Max Payload</div>
                  <div className="font-bold text-sm">{selected.maxPayload.toLocaleString()} lbs</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Maximum cargo weight capacity</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-secondary text-center">
                  <Armchair className="w-5 h-5 mx-auto mb-1 text-primary" />
                  <div className="text-xs text-muted-foreground">Seats</div>
                  <div className="font-bold text-sm">{selected.seats} total
                    {selected.removableSeats > 0 && (
                      <Badge variant="secondary" className="ml-1 text-xs">{selected.removableSeats} removable</Badge>
                    )}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total seats / removable seats ({selected.seatWeight} lbs each)</TooltipContent>
            </Tooltip>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AircraftSelect;
