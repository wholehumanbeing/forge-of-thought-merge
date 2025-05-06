import React from "react";
import useCanvasStore from "../../store/canvasStore";
import { SemanticEdgeType } from "../../constants/semanticRelationships";

export const RelationshipSelectorModal: React.FC = () => {
  const {
    pendingConnectionParams,
    confirmRelationshipSelection,
    setPendingConnection,
  } = useCanvasStore((s) => ({
    pendingConnectionParams: s.pendingConnectionParams,
    confirmRelationshipSelection: s.confirmRelationshipSelection,
    setPendingConnection: s.setPendingConnection,
  }));

  if (!pendingConnectionParams) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50">
      <div className="bg-white rounded p-6 w-72 space-y-4">
        <h2 className="text-lg font-semibold">Select edge type</h2>
        <button
          onClick={() => confirmRelationshipSelection(SemanticEdgeType.RELATED_TO)}
          className="w-full px-3 py-2 border rounded hover:bg-gray-100"
        >
          RELATES_TO
        </button>
        <button
          onClick={() => setPendingConnection(null)}
          className="w-full mt-2 text-sm text-gray-500 hover:underline"
        >
          cancel
        </button>
      </div>
    </div>
  );
};
export default RelationshipSelectorModal; 