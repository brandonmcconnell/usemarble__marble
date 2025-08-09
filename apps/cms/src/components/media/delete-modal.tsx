"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@marble/ui/components/alert-dialog";
import { Button } from "@marble/ui/components/button";
import { toast } from "@marble/ui/components/sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/queries/keys";
import { ButtonLoader } from "../ui/loader";

interface DeleteMediaProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mediaToDelete: string;
  onDeleteComplete?: (deletedMediaId: string) => void;
}

export function DeleteMediaModal({
  isOpen,
  setIsOpen,
  mediaToDelete,
  onDeleteComplete,
}: DeleteMediaProps) {
  const queryClient = useQueryClient();

  const { mutate: deleteMedia, isPending } = useMutation({
    mutationFn: async (mediaId: string) => {
      const response = await fetch("/api/media", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ mediaId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete media");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast.success("Media deleted successfully");
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEYS.MEDIA],
      });
      if (onDeleteComplete) {
        onDeleteComplete(data.id);
      }
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = () => {
    deleteMedia(mediaToDelete);
  };

  return (
    <div>
      <AlertDialog onOpenChange={setIsOpen} open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this image?</AlertDialogTitle>
            <AlertDialogDescription>
              Deleting this image will break posts where it is being used.
              Please make sure to update all posts using this image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {/* <AlertDialogAction asChild> */}
            <Button
              disabled={isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {isPending ? <ButtonLoader variant="destructive" /> : "Delete"}
            </Button>
            {/* </AlertDialogAction> */}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
