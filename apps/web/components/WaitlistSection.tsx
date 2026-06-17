import { WaitlistForm } from "@/components/WaitlistForm";

export function WaitlistSection() {
  return (
    <section id="waitlist" className="scroll-mt-20 bg-brand-700 py-16 sm:py-20">
      <div className="container-page max-w-2xl">
        <div className="text-center">
          <h2 className="text-3xl text-white sm:text-4xl">Join the beta</h2>
          <p className="mx-auto mt-3 max-w-md text-brand-50">
            We’re starting around Buckinghamshire, Berkshire and west London. Be
            first to know when your local centres go live.
          </p>
        </div>
        <div className="mt-8">
          <WaitlistForm />
        </div>
      </div>
    </section>
  );
}
