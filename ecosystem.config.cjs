module.exports = {
  apps: [{
    name: "pet.flareware.me",
    script: "src/index.ts",
    interpreter: "/home/deckyboiii/.bun/bin/bun",
    watch: true,
    ignore_watch: ["node_modules", "bun.lock"]
  }]
}