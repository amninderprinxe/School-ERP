"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { School } from "@prisma/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { Loader2 } from "lucide-react";

const feeSettingsSchema = z.object({
  receiptPrefix: z.string().min(1, "Receipt prefix is required").max(10, "Prefix is too long"),
  lateFeePercent: z.number().min(0, "Must be at least 0%").max(100, "Cannot exceed 100%"),
});

type FeeSettingsValues = z.infer<typeof feeSettingsSchema>;

interface SettingsFeesProps {
  school: Pick<School, "id" | "receiptPrefix" | "lateFeePercent">;
}

export function FeeSettingsSection({ school }: SettingsFeesProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FeeSettingsValues>({
    resolver: zodResolver(feeSettingsSchema),
    defaultValues: {
      receiptPrefix: school.receiptPrefix ?? "REC",
      lateFeePercent: Number(school.lateFeePercent ?? 0),
    },
  });

  async function onSubmit(data: FeeSettingsValues) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/schools/${school.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiptPrefix: data.receiptPrefix,
          lateFeePercent: data.lateFeePercent,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update fee settings.");
      }

      toast.success("Fee settings updated & late fees applied to pending dues.");
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee Settings</CardTitle>
        <CardDescription>
          Configure receipt prefixes and automated late fee percentages for pending student dues.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="receiptPrefix"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Receipt Prefix</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. REC, SCH-INV" {...field} />
                  </FormControl>
                  <FormDescription>
                    Prefix appended to generated fee payment receipts.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lateFeePercent"
              render={({ field }: { field: any }) => (
                <FormItem>
                  <FormLabel>Late Fee Fine Percentage (%)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.1" 
                      min="0" 
                      max="100" 
                      value={field.value ?? 0} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        field.onChange(e.target.value === "" ? 0 : parseFloat(e.target.value))
                      }
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  </FormControl>
                  <FormDescription>
                    Percentage applied automatically to students with overdue or pending balances when saved.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end">
              <SubmitButton type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </SubmitButton>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export default FeeSettingsSection;