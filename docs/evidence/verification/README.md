# Baseline launcher verification — before repair

These files preserve the first launcher run. They are not the final launcher result.

- The old core runner printed 33/34 checks but exited with code 0 and a misleading 100% label.
- The old setup runner passed 3/5 because its environment-file assumption did not match the real launch path.
- Encoding checks and compilation completed, but no Windows graphical launcher session ran in this Linux environment.

The checkpoint identifies the later repaired-run evidence separately. Always inspect assertion counts and failures as well as process exit codes in this baseline.
