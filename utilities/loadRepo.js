const { GithubRepoLoader } = require("@langchain/community/document_loaders/web/github");

const get_docs_from_repo = async (github_repo_link) => {
  const loader = new GithubRepoLoader(
    github_repo_link,
    {
      branch: "main",
      recursive: true,  // To load subfolders
      unknown: "warn",
      maxConcurrency: 5, 
    //   accessToken: process.env.GITHUB_ACCESS_TOKEN,
    }
  );
  const docs = await loader.load();
  console.log({ docs });

  return docs;
};


module.exports = { get_docs_from_repo };