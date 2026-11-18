---
name: hpc-setup
description: Use this skill to set up, or add a site to, the `hpc` tool - when ~/.config/hpc/sites.conf does not exist, when the user wants to connect a new cluster, university HPC system, national lab machine or cloud GPU machine, or when they ask to configure cluster access for Claude.
---

# Setting up compute sites

Goal: the user can say "run this on <site>" and you can copy code, submit jobs, watch
them and pull results back, without the user typing commands. You build the setup from
what the user tells you about their own sites. Every site is different, so ask; do not guess.

## Rules

- Never ask for, store, or type a password, a one-time code, a 2FA seed or an API token.
  The user logs in once in their own terminal; ssh keeps that connection open.
- Never compute on a login node, even to test the setup. `hostname`, `squeue` and `ls`
  are fine.
- Show the user each file before you write it outside the project, and ask before you
  edit `~/.ssh/config`.

## Steps

1. **Interview.** For each site, ask:
   - what it is called, its login host name, and the user's username;
   - how login works: ssh key only, or password plus a second factor;
   - the scheduler: Slurm, PBS, or none (a single machine);
   - where project files and large outputs should live (home is often small; there is
     usually project storage and a scratch area that purges old files);
   - the partitions or queues they use, which start fast, which are for testing, GPU
     types, and any per-user limits they know;
   - accounts or allocations to charge, and anything that costs money or allocation;
   - modules or environment setup that every job needs.
   Ask a few questions at a time. Accept "I don't know" and fill gaps later from the
   site's documentation (with the user's OK) or from `sinfo`/`qstat -Q` once connected.

2. **ssh.** Propose a `Host` block per site, based on
   `${CLAUDE_PLUGIN_ROOT}/templates/ssh_config.example`. Include the ControlMaster lines
   for every site: each `hpc` call and each poll of the compute pane is an ssh
   connection. After the user approves, add the blocks to `~/.ssh/config`.
   Then ask the user to open the connection themselves: `! ssh -fN <site>`.

3. **Registry.** Write `~/.config/hpc/sites.conf` from
   `${CLAUDE_PLUGIN_ROOT}/templates/sites.conf.example`, one block per site.
   Write `BASE` as an absolute remote path. Do not use `~` or `$HOME`: they expand on
   this computer, not on the site.
   For a ControlMaster site, `AUTH_CHECK` is `ssh -O check <site>`. For a key-only site,
   it is `ssh -o BatchMode=yes -o ConnectTimeout=5 <site> true`.

4. **Notes.** Write `~/.config/hpc/notes/<site>.md` with what you learned: partitions and
   their limits, storage paths and purge rules, accounts, GPU types, modules, costs, and
   which partition to use for smoke tests. The `hpc` skill reads these notes before every
   run. Keep them short and factual.

5. **Command.** The plugin puts `hpc` on the Bash tool's PATH, so you need no link.
   Check it with `command -v hpc`. If the user wants `hpc` in their own terminal too,
   offer a link in `~/.local/bin`:
   - Run `ls -l ~/.local/bin/hpc` first. If a file is there, show it to the user and ask
     before you replace it.
   - Then run `mkdir -p ~/.local/bin && ln -sfn "${CLAUDE_PLUGIN_ROOT}/bin/hpc" ~/.local/bin/hpc`.
   - Tell the user that a plugin update moves the plugin folder and breaks the link. They
     can ask you to run this step again after an update.

6. **Test.** Run `hpc sites`. For each connected site, run `SITE=<site> hpc sh hostname`
   and `SITE=<site> hpc q`. Then make a smoke-test job from the template: 5 minutes,
   1 CPU, 1G of memory, no GPU, and a body of `echo hello; sleep 30`. Copy it to the site
   with `hpc push`, and submit it to the test partition with `hpc sbatch`. Watch it to
   the end, and read its log with `hpc log`. Report what worked and what did not.

7. **Optional.** If the site has no scheduler and bills by the hour (a cloud GPU machine),
   write in its notes how to start and stop it, and remind the user that it bills while
   it runs.
