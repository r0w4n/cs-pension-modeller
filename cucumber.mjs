export default {
  paths: ["features/**/*.feature"],
  import: ["features/step-definitions/**/*.ts"],
  tags: "not @pending",
  format: ["progress", "summary"],
};
