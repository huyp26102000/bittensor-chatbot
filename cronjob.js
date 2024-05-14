const { exec } = require("child_process");
const command = "btcli subnets metagraph --netuid 23";
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }

  // stdout contains the output of the command
  console.log(`stdout: ${stdout}`);

  // Process the output data
  const lines = stdout.trim().split("\n");
  lines.forEach((line) => {
    const parts = line.split(/\s+/);
    const fileName = parts[parts.length - 1];
    // Do something with the file name, e.g., log it
    console.log(`File: ${fileName}`);
  });

  // stderr contains any error messages from the command
  console.error(`stderr: ${stderr}`);
});
