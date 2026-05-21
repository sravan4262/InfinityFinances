"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderOpen, X, Trash2, Link, Loader2, Globe, Lock } from "lucide-react";
import { plansApi, type SavedPlan } from "@/lib/api/plans";
import { useFireStore } from "@/lib/store";
import { useUser } from "@/lib/hooks/useUser";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export function PlansDrawer() {
  const [open, setOpen] = useState(false);
  const { user } = useUser();
  const router = useRouter();
  const [plans, setPlans] = useState<SavedPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<SavedPlan | null>(null);
  const { loadPlan, calculate } = useFireStore();

  const loadPlans = async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await plansApi.list();
      setPlans(rows);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) loadPlans(); }, [open]);

  const handleLoad = (plan: SavedPlan) => {
    loadPlan(plan.id, plan.name, plan.inputs);
    calculate();
    setOpen(false);
  };

  const handleDelete = (plan: SavedPlan, e: React.MouseEvent) => {
    e.stopPropagation();
  };
  const confirmDelete = async () => {
    if (!planToDelete) return;
    await plansApi.delete(planToDelete.id);
    setPlans((prev) => prev.filter((p) => p.id !== planToDelete.id));
    setPlanToDelete(null);
  };

  const handleTogglePublic = async (plan: SavedPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = await plansApi.update(plan.id, { isPublic: !plan.isPublic });
    setPlans((prev) => prev.map((p) => (p.id === plan.id ? updated : p)));
  };

  const handleCopyLink = async (plan: SavedPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!plan.isPublic) {
      await plansApi.update(plan.id, { isPublic: true });
      setPlans((prev) => prev.map((p) => (p.id === plan.id ? { ...p, isPublic: true } : p)));
    }
    await navigator.clipboard.writeText(`${location.origin}/plan/${plan.id}`);
    setCopiedId(plan.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <>
      <button
        onClick={() => user ? setOpen(true) : router.push("/auth/login")}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded-lg px-3 py-2.5 transition-colors"
      >
        <FolderOpen className="w-3.5 h-3.5" />
        My plans
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full w-full max-w-sm bg-background border-l border-border z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <p className="font-semibold text-sm">My saved plans</p>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {loading && (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {error && <p className="text-xs text-destructive text-center py-4">{error}</p>}
                {!loading && !error && plans.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No saved plans yet.</p>
                )}
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    onClick={() => handleLoad(plan)}
                    className="w-full text-left glass rounded-xl p-3.5 hover:bg-muted/20 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{plan.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {new Date(plan.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => handleCopyLink(plan, e)}
                          title={copiedId === plan.id ? "Copied!" : "Copy share link"}
                          className={cn(
                            "p-1.5 rounded-lg hover:bg-primary/10 transition-colors",
                            copiedId === plan.id ? "text-success" : "text-muted-foreground hover:text-primary"
                          )}
                        >
                          <Link className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleTogglePublic(plan, e)}
                          title={plan.isPublic ? "Make private" : "Make public"}
                          className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {plan.isPublic
                            ? <Globe className="w-3.5 h-3.5 text-primary" />
                            : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => {
                            handleDelete(plan, e);
                            setPlanToDelete(plan);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
            {planToDelete && (
              <div className="fixed inset-0 z-[60] grid place-items-center bg-black/60 p-4">
                <div className="w-full max-w-md rounded-2xl border border-border bg-background p-5 space-y-4">
                  <div>
                    <p className="font-semibold">Delete {planToDelete.name}?</p>
                    <p className="text-sm text-muted-foreground">This removes the saved plan permanently.</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPlanToDelete(null)} className="rounded-lg px-3 py-2 text-sm text-muted-foreground">Cancel</button>
                    <button onClick={confirmDelete} className="rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground">Delete plan</button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </AnimatePresence>
    </>
  );
}
