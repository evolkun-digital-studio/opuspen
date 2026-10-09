type ScriptProps = {
  children: string;
  /**
   * How the word is written in: "play" once it scrolls into view, "scrub" with
   * the scroll position. Leave it out when the parent's state reveals the word
   * (an `.is-active` ancestor) or when it should simply be there.
   */
  write?: "play" | "scrub";
  className?: string;
};

/**
 * One handwritten word or phrase in gold ink (Hiragenda), always beside the
 * serif display face and never more than one per screen. Gold on dark,
 * bronze on ivory sections; about 1.35x the serif around it. Its long
 * swashes need room: .script-text is padded so no clip or mask cuts them.
 * The ink dot rides the leading edge of the writing mask (see the motion
 * hook and .script-ink).
 */
export function Script({ children, write, className }: ScriptProps) {
  const classes = ["script", className].filter(Boolean);
  return (
    <span className={classes.join(" ")} data-write={write}>
      <span className="script-text">{children}</span>
      <span className="script-ink" aria-hidden="true">
        <span />
      </span>
    </span>
  );
}
