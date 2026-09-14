// =============================================================================
// CREATE SPACE DIALOG (src/components/CreateSpaceDialog.tsx)
// =============================================================================
// A form modal for creating a new virtual space via POST /api/v1/space.
//
// 🎓 ERROR HANDLING IN FORMS:
// When the user submits an invalid form or the API returns an error,
// we show user-friendly error messages.
// We track loading state (isLoading) to prevent double-submits.
// =============================================================================

import { useState } from "react";
import { createSpaceApi } from "@/api/space";
import { Modal, Button, Input } from "@/components/ui";

interface CreateSpaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (spaceId: string) => void; // Callback: notify parent that a space was created
}

export default function CreateSpaceDialog({
  isOpen,
  onClose,
  onCreated,
}: CreateSpaceDialogProps) {
  // Form state — controlled inputs
  const [name, setName] = useState("");
  const [width, setWidth] = useState(80);
  const [height, setHeight] = useState(60);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission (page reload)
    setError(null);

    // Basic client-side validation
    if (!name.trim()) {
      setError("Space name is required");
      return;
    }
    if (width < 10 || height < 10) {
      setError("Minimum size is 10 × 10 tiles");
      return;
    }
    if (width > 500 || height > 500) {
      setError("Maximum size is 500 × 500 tiles");
      return;
    }

    setIsLoading(true);

    try {
      // Call POST /api/v1/space via our API module
      const { spaceId } = await createSpaceApi({
        name: name.trim(),
        width,
        height,
      });

      // Success! Notify parent and close
      onCreated(spaceId);
      onClose();
      resetForm();
    } catch (err: unknown) {
      // Parse Axios error to get the server's error message
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      const message =
        axiosErr.response?.data?.detail ??
        "Failed to create space. Please try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setWidth(50);
    setHeight(50);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Space">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Space name input */}
        <Input
          label="Space Name"
          placeholder="e.g. Team Office, Study Hall..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {/* Dimensions */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Width (tiles)"
            type="number"
            min={10}
            max={500}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
          <Input
            label="Height (tiles)"
            type="number"
            min={10}
            max={500}
            value={height}
            onChange={(e) => setHeight(Number(e.target.value))}
          />
        </div>

        {/* Size preview */}
        <div className="glass-card p-3 text-sm text-metaverse-muted">
          Map size:{" "}
          <span className="text-white font-medium">
            {width} × {height} tiles
          </span>{" "}
          ({width * 32} × {height * 32} pixels)
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-metaverse-danger/10 border border-metaverse-danger/30 px-4 py-3 text-sm text-metaverse-danger">
            {error}
          </div>
        )}

        {/* Submit button */}
        <div className="flex gap-3 pt-2">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={handleClose}
            type="button"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            isLoading={isLoading}
            type="submit"
          >
            Create Space
          </Button>
        </div>
      </form>
    </Modal>
  );
}
