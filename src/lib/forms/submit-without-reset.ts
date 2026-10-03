import { startTransition, type FormEvent } from "react";

/**
 * onSubmit handler that runs a form action without React's automatic reset.
 *
 * React 19 resets a `<form action={...}>` after every submission, including
 * ones that come back with validation errors. Controlled fields (selects,
 * radios kept in state) then show the reset value while state keeps the old
 * one, so the next submit sends something the user didn't choose.
 */
export function submitWithoutReset(action: (data: FormData) => void) {
  return (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  };
}
