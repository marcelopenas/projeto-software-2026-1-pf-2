import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";

type CourseStatus = "DISPONIVEL" | "CANCELADO";

type Course = {
  id: string;
  code: string;
  name: string;
  instructor: string;
  createdAt: string;
  status: CourseStatus;
  adminEmail: string;
};

const ADMIN_ROLE = "ADMIN";
const USER_ROLE = "USER";
const ADMIN_EMAIL = "admin@social.com";
const ROLE_CLAIM = import.meta.env.VITE_AUTH0_ROLE_CLAIM || "https://example.com/roles";

function getRolesFromUser(user: any): string[] {
  const claim = user?.[ROLE_CLAIM] ?? user?.roles ?? user?.role;
  if (Array.isArray(claim)) {
    return claim;
  }
  if (typeof claim === "string") {
    return claim.split(",").map((role) => role.trim());
  }
  return [];
}

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const {
    loginWithRedirect,
    logout,
    user,
    isAuthenticated,
    isLoading,
    getAccessTokenSilently,
  } = useAuth0();

  const roles = useMemo(() => getRolesFromUser(user), [user]);
  const isAdmin =
    roles.includes(ADMIN_ROLE) || user?.email === ADMIN_EMAIL;
  const isUser = roles.includes(USER_ROLE);

  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formState, setFormState] = useState({
    code: "",
    name: "",
    instructor: "",
    status: "DISPONIVEL" as CourseStatus,
  });

  const authHeader = async () => {
    try {
      const token = await getAccessTokenSilently();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      return headers;
    } catch (err) {
      return { "Content-Type": "application/json" };
    }
  };

  const handleError = (message: string) => {
    setError(message);
    setTimeout(() => setError(null), 6000);
  };

  const loadCourses = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);

    try {
      const headers = await authHeader();
      const response = await fetch("/courses", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao buscar cursos: ${response.status} ${response.statusText}`
        );
      }

      const data = (await response.json()) as Course[];
      setCourses(data);
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : "Erro ao carregar cursos"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [isAuthenticated]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isAdmin) return;

    setSubmitting(true);
    setError(null);

    try {
      const headers = await authHeader();
      const response = await fetch("/courses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          code: formState.code,
          name: formState.name,
          instructor: formState.instructor,
          status: formState.status,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao cadastrar curso: ${response.status} ${response.statusText}`
        );
      }

      setFormState({ code: "", name: "", instructor: "", status: "DISPONIVEL" });
      await loadCourses();
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : "Erro ao cadastrar curso"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    setSubmitting(true);
    setError(null);

    try {
      const headers = await authHeader();
      const response = await fetch(`/courses/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
      });

      if (!response.ok) {
        throw new Error(
          `Falha ao excluir curso: ${response.status} ${response.statusText}`
        );
      }

      setCourses((current) => current.filter((course) => course.id !== id));
    } catch (err) {
      handleError(
        err instanceof Error ? err.message : "Erro ao excluir curso"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 px-4 py-8">
      <section className="mx-auto max-w-6xl space-y-6 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">
              Universidade - API de Cursos
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Gerenciamento de cursos
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {isAuthenticated ? (
              <>
                <div className="rounded-2xl bg-slate-100 px-4 py-3 text-slate-700 ring-1 ring-slate-200">
                  <p className="text-sm">Conectado como:</p>
                  <p className="font-medium">{user?.email ?? "Usuário"}</p>
                  <p className="text-xs text-slate-500">
                    Papel: {isAdmin ? "ADMIN" : isUser ? "USER" : "Sem papel"}
                  </p>
                </div>
                <button
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                  onClick={() =>
                    logout({ logoutParams: { returnTo: window.location.origin } })
                  }
                >
                  Sair
                </button>
              </>
            ) : (
              <button
                className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                onClick={() => loginWithRedirect()}
              >
                Entrar com Auth0
              </button>
            )}
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-4 rounded-3xl bg-slate-50 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Cursos</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Liste os cursos disponíveis e verifique as informações do instrutor.
                </p>
              </div>
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white">
                {isAdmin ? "ADMIN" : isUser ? "USER" : "Visibilidade"}
              </span>
            </div>

            {error ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!isAuthenticated ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-700">
                <p className="text-sm">
                  Faça login para visualizar e gerenciar os cursos.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
                  <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 font-medium text-slate-600">ID</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Código</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Nome</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Instrutor</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Cadastro</th>
                        <th className="px-4 py-3 font-medium text-slate-600">Admin</th>
                        {isAdmin ? <th className="px-4 py-3 font-medium text-slate-600">Ações</th> : null}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {loading ? (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                            Carregando cursos...
                          </td>
                        </tr>
                      ) : courses.length === 0 ? (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className="px-4 py-6 text-center text-sm text-slate-500">
                            Nenhum curso encontrado.
                          </td>
                        </tr>
                      ) : (
                        courses.map((course) => (
                          <tr key={course.id}>
                            <td className="px-4 py-4 text-slate-700">{course.id}</td>
                            <td className="px-4 py-4 text-slate-700">{course.code}</td>
                            <td className="px-4 py-4 text-slate-700">{course.name}</td>
                            <td className="px-4 py-4 text-slate-700">{course.instructor}</td>
                            <td className="px-4 py-4 text-slate-700">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                  course.status === "DISPONIVEL"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
                                }`}
                              >
                                {course.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-700">{formatDate(course.createdAt)}</td>
                            <td className="px-4 py-4 text-slate-700">{course.adminEmail}</td>
                            {isAdmin ? (
                              <td className="px-4 py-4">
                                <button
                                  className="rounded-2xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                                  disabled={submitting}
                                  onClick={() => handleDelete(course.id)}
                                >
                                  Excluir
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {isAuthenticated && isAdmin ? (
            <section className="rounded-3xl bg-slate-50 p-6">
              <h2 className="text-xl font-semibold">Cadastrar novo curso</h2>
              <p className="mt-1 text-sm text-slate-600">
                Preencha os dados do curso para criar uma nova entrada.
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Código do curso</span>
                  <input
                    value={formState.code}
                    onChange={(event) => setFormState((current) => ({ ...current, code: event.target.value }))}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-slate-200 transition focus:ring-2"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Nome do curso</span>
                  <input
                    value={formState.name}
                    onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-slate-200 transition focus:ring-2"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Nome do instrutor</span>
                  <input
                    value={formState.instructor}
                    onChange={(event) => setFormState((current) => ({ ...current, instructor: event.target.value }))}
                    required
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-slate-200 transition focus:ring-2"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Status</span>
                  <select
                    value={formState.status}
                    onChange={(event) => setFormState((current) => ({ ...current, status: event.target.value as CourseStatus }))}
                    className="mt-2 w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none ring-slate-200 transition focus:ring-2"
                  >
                    <option value="DISPONIVEL">DISPONIVEL</option>
                    <option value="CANCELADO">CANCELADO</option>
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Aguarde..." : "Cadastrar curso"}
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </section>
    </main>
  );
}
