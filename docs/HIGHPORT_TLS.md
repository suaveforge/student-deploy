# Student-only independent high-port HTTPS

This deployment is **on 19443 only**. No configuration, renewal, listener, or TLS certificate from Caddy is used. Student backend is already 127.0.0.1:18787. The standalone Nginx container serves **https://student.suaveforge.com:19443**, using an independently issued Let's Encrypt DNS-01 certificate via the existing server-side Spaceship secret. DNS A is unchanged.

- Script: `scripts/setup-student-highport-https-server123.sh`
- Config: `config/nginx-student-19443.conf`
- Private material on server123: `/home/student/tls-acme` (never published to Git)
- Isolated container: `suaveforge_student_https_19443`
- Old shared port 443 / existing Caddy service remain **untouched** (not used by new 19443 URL).
- Certificate renewal MUST be configured and tested independently before long-term use. Do not claim automatic renewal without proving the scheduled renewal job and reload.
- Run fresh headed Chrome 13-step and PC/mobile QA against the **:19443** URL; existing recordings showing 443 are historical only.
- Backout only the Student TLS container: `docker rm -f suaveforge_student_https_19443`. Do not modify the Student backend, DNS A, or other sites.

Any failure blocks release; never claim high-port success without externally validated HTTPS 200 and valid cert. The default synthetic accounts are published; protect this demo if it is shared externally.
