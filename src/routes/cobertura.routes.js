const { Router } = require("express");
const { listarCoberturas } = require("../controllers/cobertura.controller");

const router = Router();

router.get("/", listarCoberturas);

module.exports = router;
