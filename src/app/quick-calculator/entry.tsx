import { resolveAppBaseHref } from "../app-base";

const destination = new URL(resolveAppBaseHref(), window.location.href);
destination.searchParams.set("journey", "quick");
window.location.replace(destination.href);
