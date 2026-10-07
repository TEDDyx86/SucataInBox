// @ts-check
import { module } from "@prisma/composer";
import cbloSiteService from "./service.mjs";

export default module("vps", ({ provision }) => {
  provision(cbloSiteService, { id: "cblosite" });
});
