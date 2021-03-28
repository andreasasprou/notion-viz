import forgotPassword from "app/auth/mutations/forgotPassword";
import { ForgotPassword } from "app/auth/validations";
import { Form, FORM_ERROR } from "app/core/components/Form";
import { LabeledTextField } from "app/core/components/LabeledTextField";
import Layout from "app/core/layouts/Layout";
import { BlitzPage, useMutation } from "blitz";

const ForgotPasswordPage: BlitzPage = () => {
  const [forgotPasswordMutation, { isSuccess }] = useMutation(forgotPassword);

  return (
    <div>
      <h1>Forgot your password?</h1>

      {isSuccess ? (
        <div>
          <h2>Request Submitted</h2>
          <p>
            If your email is in our system, you will receive instructions to reset your password
            shortly.
          </p>
        </div>
      ) : (
        <Form
          submitText="Send Reset Password Instructions"
          schema={ForgotPassword}
          initialValues={{ email: "" }}
          onSubmit={async (values) => {
            try {
              await forgotPasswordMutation(values);
            } catch (error) {
              return {
                [FORM_ERROR]: "Sorry, we had an unexpected error. Please try again.",
              };
            }
          }}
        >
          <LabeledTextField name="email" label="Email" placeholder="Email" />
        </Form>
      )}
    </div>
  );
};

ForgotPasswordPage.redirectAuthenticatedTo = "/";
ForgotPasswordPage.getLayout = (page) => <Layout title="Forgot Your Password?">{page}</Layout>;

export default ForgotPasswordPage;
