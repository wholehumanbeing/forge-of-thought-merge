
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IgniteFabProps {
  onClick: () => void;
}

const IgniteFab = ({ onClick }: IgniteFabProps) => {
  return (
    <div className="fixed bottom-4 right-4">
      <Button 
        size="lg"
        className="h-18 w-18 rounded-full bg-gradient-to-r from-flux to-ember hover:from-ember hover:to-flux shadow-xl shadow-black/20 p-4"
        onClick={onClick}
      >
        <Star className="h-6 w-6" />
      </Button>
    </div>
  );
};

export default IgniteFab;
