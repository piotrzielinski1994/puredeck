import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";

export function DemoForm() {
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { front: "" },
    onSubmit: ({ value }) => {
      setSubmitted(value.front);
    },
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-3"
    >
      <form.Field
        name="front"
        validators={{
          onChange: ({ value }) =>
            value.trim() === "" ? "Front is required" : undefined,
        }}
      >
        {(field) => (
          <div className="flex flex-col gap-1">
            <label htmlFor={field.name} className="text-sm font-medium">
              Front
            </label>
            <input
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            {field.state.meta.errors.length > 0 && (
              <p role="alert" className="text-sm text-destructive">
                {String(field.state.meta.errors[0])}
              </p>
            )}
          </div>
        )}
      </form.Field>

      <Button type="submit">Add card</Button>

      {submitted !== null && (
        <p className="text-sm text-muted-foreground">
          Added card: {submitted}
        </p>
      )}
    </form>
  );
}
