import styles from "./OnboardingChecklist.module.css";

interface OnboardingChecklistProps {
  hasProject: boolean;
  copiedLink: boolean;
  hasGuestComment: boolean;
}

export function OnboardingChecklist({ hasProject, copiedLink, hasGuestComment }: OnboardingChecklistProps) {
  if (hasProject && copiedLink && hasGuestComment) return null;

  const steps = [
    { label: "Create your first project", done: hasProject },
    { label: "Copy your share link", done: copiedLink },
    { label: "Invite a reviewer", done: hasGuestComment },
  ];

  return (
    <section aria-label="Getting started" className={`card ${styles.card}`}>
      <h2 className={styles.heading}>Get started</h2>
      <ul className={styles.list}>
        {steps.map((step) => (
          <li
            key={step.label}
            data-done={step.done}
            className={`${styles.step} ${step.done ? styles.stepDone : ""}`}
          >
            <span className={`${styles.mark} ${step.done ? styles.markDone : ""}`} aria-hidden="true">
              {step.done ? "✓" : ""}
            </span>
            {step.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
