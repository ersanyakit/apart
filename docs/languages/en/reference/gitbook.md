# GitBook connection for documentation administrators

This page is for the person publishing the guide. Reception staff do not need to perform these steps.

## Repository structure

- The repository-root `gitbook-docs.yaml` describes the site and maps each language to its documentation directory. Its file name does not start with a dot.
- Turkish content remains in `docs/`. Translated editions are in `docs/languages/` under their language codes.
- Each language directory has its own `.gitbook.yaml`, `README.md`, `SUMMARY.md` and `images/` folder.
- Topic file names are in English across all editions. The screenshots retain the Turkish interface.

The configuration follows the [official Git Sync documentation](https://gitbook.com/docs/docs-as-code/git-sync/content-configuration). Preparing files does not by itself connect or publish a GitBook site.

## Connect the repository

1. Verify that all guide files are committed and pushed to the GitHub branch you intend to use.
2. Open the Git Sync connection for the documentation site in GitBook.
3. Choose the repository and branch. Leave Project directory empty or use `./`. The site configuration is at the repository root and maps each language to its own folder.
4. For initial synchronization, import the existing GitHub content into GitBook. If you already have content in GitBook, review the chosen synchronization direction.
5. Preview the language editions, page order, images and internal links.
6. Set the publication address and access settings in your account, then publish when ready.

## Missing configuration error

If GitBook reports that `gitbook-docs.yaml` does not exist on the branch, check that the correctly named file is present at the root of the selected remote branch. A local file alone is not enough. Neither `.gitbook-docs.yaml` nor `.gitbook.yaml` replaces the site configuration. After pushing the file, retry with the same branch.

Do not set Project directory to `docs` for this configuration. Each mapped language directory uses `root: ./` in its `.gitbook.yaml` file. Keep existing space keys stable after synchronization; use title fields for renaming.

## Maintain translations

When an action or screen changes, update the matching page in every language edition. List each new page once in that edition's `SUMMARY.md`. Keep image links relative and inside the mapped language folder so GitHub and GitBook can resolve them.

Update screenshots alongside instructions. Keep README edits in the repository when Git Sync is enabled. Do not document unavailable features or nonfunctional live demo addresses.
