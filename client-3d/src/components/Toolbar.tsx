import { useState } from "react";
import { Layers, Book, Link2, MapPin, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import ViewToggle from "./ViewToggle";
import useForgeStore, { Node } from "@/store/useForgeStore";
import LibraryPanel from "./panels/LibraryPanel";
import archetypeColors from "@/constants/archetypeColors";

interface ToolbarProps {
  onToggleControls?: () => void;
  controlsLocked?: boolean;
}

const Toolbar = ({ onToggleControls, controlsLocked = false }: ToolbarProps) => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const addNode = useForgeStore((state) => state.addNode);

  const handlePlaceNodeFromLibrary = (selectedNode: Node) => {
    const newNode: Node = {
      id: crypto.randomUUID(),
      label: selectedNode.label,
      type: selectedNode.type,
      color: selectedNode.color || archetypeColors[selectedNode.type.toUpperCase() as keyof typeof archetypeColors] || archetypeColors.DEFAULT || "#FFFFFF",
      pos: [
        Math.random() * 10 - 5,
        0,
        Math.random() * 10 - 5,
      ],
      data: selectedNode.data || {},
    };
    addNode(newNode);
    setIsLibraryOpen(false);
  };

  return (
    <>
      {/* Floating Toolbar */}
      <div 
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 bg-forge-dark/70 rounded-lg p-2 transition-opacity duration-200",
          "opacity-100"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex flex-col gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-forge-dark/50">
                  <Layers className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Depth Control</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:bg-forge-dark/50"
                  onClick={() => setIsLibraryOpen(true)}
                >
                  <Book className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Library</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="hover:bg-forge-dark/50">
                      <Link2 className="h-5 w-5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="right" className="bg-forge-dark/90 text-white">
                    <div className="space-y-3">
                      <h3 className="text-sm font-medium">Edge Legend</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-8 rounded bg-[#49E3F6]" />
                          <p className="text-xs">Connection</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-8 rounded bg-[#F3B248]" />
                          <p className="text-xs">Synthesis</p>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Edge Legend</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="hover:bg-forge-dark/50">
                  <MapPin className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Minimap</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant={controlsLocked ? "default" : "ghost"} 
                  size="icon" 
                  className={cn(
                    "hover:bg-forge-dark/50",
                    controlsLocked && "bg-purple-600 hover:bg-purple-700"
                  )}
                  onClick={onToggleControls}
                >
                  <Lock className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{controlsLocked ? "Unlock Controls" : "Lock Controls"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Library Drawer */}
      <Sheet open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <SheetContent className="bg-forge-dark/95 border-forge-dark text-white w-80">
          <SheetHeader>
            <SheetTitle className="text-white">Node Library</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-5rem)] pr-4 mt-6">
            <LibraryPanel onNodeSelect={handlePlaceNodeFromLibrary} />
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* View toggle pinned in header or toolbar corner */}
      <div className="fixed top-4 right-4 z-50">
        <ViewToggle />
      </div>

      {/* Fixed Lock Controls button */}
      <div className="fixed bottom-4 right-4 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={controlsLocked ? "default" : "outline"} 
                size="default" 
                className={cn(
                  "flex items-center gap-2",
                  controlsLocked && "bg-purple-600 hover:bg-purple-700"
                )}
                onClick={onToggleControls}
              >
                <Lock className="h-4 w-4" />
                {controlsLocked ? "Unlock Controls" : "Lock Controls"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Click to {controlsLocked ? "unlock" : "lock"} mouse pointer for WASD movement</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
};

export default Toolbar;
