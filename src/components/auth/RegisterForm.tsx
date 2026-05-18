import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { PasswordField } from "@/components/auth/PasswordField";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";
import { RegisterSuccess } from "@/components/auth/RegisterSuccess";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { DEPARTMENTS, ROLE_OPTIONS } from "@/lib/auth/constants";
import { registerSchema, type RegisterFormValues } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";

export function RegisterForm() {
  const { register: registerAccount } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ name: string; path: string } | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      employeeId: "",
      password: "",
      confirmPassword: "",
      department: "",
      role: "employee",
      acceptTerms: false as unknown as true,
    },
  });

  const password = form.watch("password");

  const onSubmit = async (values: RegisterFormValues) => {
    setSubmitting(true);
    try {
      const path = await registerAccount({
        fullName: values.fullName,
        email: values.email,
        employeeId: values.employeeId,
        password: values.password,
        department: values.department,
        role: values.role,
      });
      setSuccess({ name: values.fullName.split(" ")[0] ?? values.fullName, path });
      toast.success("Account created successfully");
    } catch (err) {
      toast.error("Registration failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <RegisterSuccess
        name={success.name}
        onContinue={() => navigate({ to: success.path })}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.3 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5 max-h-[52vh] overflow-y-auto pr-1 custom-scrollbar">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Full name
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Aria Chen"
                    className={cn("h-10 bg-background/60", fieldState.error && "border-destructive")}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Work email
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="aria@company.com"
                      className={cn("h-10 bg-background/60", fieldState.error && "border-destructive")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Employee ID
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="GS-10482"
                      className={cn("h-10 bg-background/60 font-mono text-sm", fieldState.error && "border-destructive")}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <FormField
            control={form.control}
            name="password"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Password
                </FormLabel>
                <FormControl>
                  <PasswordField
                    placeholder="Create a strong password"
                    error={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <AnimatePresence>
                  <PasswordStrengthIndicator password={password} />
                </AnimatePresence>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Confirm password
                </FormLabel>
                <FormControl>
                  <PasswordField
                    placeholder="Re-enter password"
                    error={!!fieldState.error}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Department
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background/60">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Role
                  </FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background/60">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ROLE_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          <span className="font-medium">{r.label}</span>
                          <span className="text-muted-foreground ml-2 text-xs hidden sm:inline">
                            — {r.description}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </motion.div>

          <FormField
            control={form.control}
            name="acceptTerms"
            render={({ field }) => (
              <FormItem className="flex items-start gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value === true}
                    onCheckedChange={(v) => field.onChange(v === true)}
                    id="acceptTerms"
                  />
                </FormControl>
                <FormLabel
                  htmlFor="acceptTerms"
                  className="text-sm font-normal text-muted-foreground leading-snug cursor-pointer"
                >
                  I agree to the{" "}
                  <button type="button" className="text-primary hover:underline">
                    Terms & Conditions
                  </button>{" "}
                  and Privacy Policy
                </FormLabel>
                <FormMessage />
              </FormItem>
            )}
          />

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
            <Button
              type="submit"
              className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/25 sticky bottom-0"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </motion.div>
        </form>
      </Form>
    </motion.div>
  );
}
