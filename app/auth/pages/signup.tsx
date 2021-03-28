import { SignupForm } from "app/auth/components/SignupForm";
import Layout from "app/core/layouts/Layout";
import { BlitzPage, useRouter } from "blitz";

const SignupPage: BlitzPage = () => {
  const router = useRouter();

  return (
    <div>
      <SignupForm onSuccess={() => router.push("/")} />
    </div>
  );
};

SignupPage.redirectAuthenticatedTo = "/";
SignupPage.getLayout = (page) => <Layout title="Sign Up">{page}</Layout>;

export default SignupPage;
