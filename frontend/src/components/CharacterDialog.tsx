// =============================================================================
// CHARACTER DIALOG (src/components/CharacterDialog.tsx)
// =============================================================================
// A modal dialog where the user selects their avatar character before entering a space.
// Also lets the user enter/generate a Space ID.
//
// Inspired by the CharacterDialog in the reference repo (AbdullahMukadam/metaverse)
// but adapted to work with our FastAPI backend's Spaces system instead of
// the reference's in-memory room IDs.
//
// 🎓 CONTROLLED vs UNCONTROLLED FORM INPUTS:
// Uncontrolled: The DOM owns the value (read with ref.current.value)
// Controlled:   React state owns the value (value={state} onChange={setState})
// We use CONTROLLED inputs — React is always the source of truth for form data.
// =============================================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "@/state/useStore";
import { Modal, Button } from "@/components/ui";
import type { Space } from "@/state/useStore";

interface CharacterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  space: Space; // The space we're about to enter
}

// Character options — in a real implementation these would come from GET /api/v1/avatars
const CHARACTER_OPTIONS = [
  { id: "male", label: "Male", emoji: "🧑" },
  { id: "female", label: "Female", emoji: "👩" },
];

export default function CharacterDialog({
  isOpen,
  onClose,
  space,
}: CharacterDialogProps) {
  const navigate = useNavigate();
  const { selectedCharacter, setSelectedCharacter } = useStore();

  // Form state
  const [step, setStep] = useState<1 | 2>(1); // Step 1: confirm space, Step 2: pick character
  const [isEntering, setIsEntering] = useState(false);

  const handleEnterSpace = async () => {
    setIsEntering(true);

    // Save the character selection to our Zustand store
    // (It's already persisted to localStorage via the persist middleware)
    setSelectedCharacter(selectedCharacter);

    // Navigate to the game page with the space ID in the URL
    // The GamePage component will read :spaceId and connect to WebSocket
    navigate(`/game/${space.id}`);
  };

  const handleClose = () => {
    setStep(1); // Reset to step 1 for next time
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Enter Space">
      {step === 1 ? (
        // =====================================================================
        // STEP 1: Confirm Space Info
        // =====================================================================
        <div className="space-y-5 animate-fade-in">
          <div className="glass-card p-4">
            <p className="text-sm text-metaverse-muted mb-1">
              You are entering
            </p>
            <h3 className="text-lg font-bold text-white">{space.name}</h3>
            <p className="text-sm text-metaverse-muted mt-1">
              {space.width} × {space.height} tiles
            </p>
          </div>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={() => setStep(2)}
          >
            Continue →
          </Button>
        </div>
      ) : (
        // =====================================================================
        // STEP 2: Character Selection
        // =====================================================================
        <div className="space-y-5 animate-fade-in">
          <p className="text-sm text-metaverse-muted">
            Choose your character avatar:
          </p>

          {/* Character selection grid */}
          <div className="grid grid-cols-2 gap-3">
            {CHARACTER_OPTIONS.map((option) => (
              <button
                key={option.id}
                onClick={() => setSelectedCharacter(option.id)}
                className={`
                  flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200
                  ${
                    selectedCharacter === option.id
                      ? "border-metaverse-accent bg-metaverse-accent/10 shadow-lg shadow-metaverse-accent/20"
                      : "border-metaverse-border bg-metaverse-surface hover:border-metaverse-accent/50"
                  }
                `}
              >
                {/* Character emoji/sprite preview */}
                <span className="text-4xl">{option.emoji}</span>
                <span className="text-sm font-medium text-white">
                  {option.label}
                </span>

                {/* Selection indicator */}
                {selectedCharacter === option.id && (
                  <div className="flex items-center gap-1 text-metaverse-accent text-xs font-bold">
                    ✓ Selected
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              ← Back
            </Button>
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              isLoading={isEntering}
              onClick={handleEnterSpace}
            >
              Enter Space 🚀
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
