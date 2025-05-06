
import { useState } from "react";
import { Layers, Book, Link2, MapPin } from "lucide-react";
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

const Toolbar = () => {
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Toolbar */}
      <div 
        className={cn(
          "fixed left-4 top-1/2 -translate-y-1/2 bg-forge-dark/70 rounded-lg p-2 transition-opacity duration-200",
          isHovered ? "opacity-100" : "opacity-0"
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
            <div className="grid grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i} 
                  className="p-4 bg-forge-dark/80 border border-white/10 rounded-lg flex items-center justify-center aspect-square hover:border-white/30 cursor-grab transition-all"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-400/80" />
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-white/50 mt-8 mb-4">
              Drag nodes to create new concepts
            </p>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default Toolbar;
