/**
 * Shared building blocks for the legal pages (/impressum, /datenschutz).
 */

/** Operator details passed to both language versions of the privacy policy. */
export interface PrivacyProps {
  name: string;
  email: string;
  address: string;
  phone?: string;
}

/** Consistent section wrapper with numbered heading */
export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold font-[family-name:var(--font-ui)]! text-[var(--text-primary)] border-b border-[var(--border)] pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Bold subheading within a section */
export function Subheading({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-semibold mt-2 text-[var(--text-primary)] font-[family-name:var(--font-ui)]">
      {children}
    </p>
  );
}
