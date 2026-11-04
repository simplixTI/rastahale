import { describe, it, expect, vi } from "vitest";
import { render, fireEvent, waitFor } from "@testing-library/react";
import VideoFormModal from "@/components/VideoFormModal";

const instructors = [{ id: "prof-1", name: "Professor Um", avatar: "", bio: "" }];
const modules = [{ id: "m1", name: "Defesas", category: "jiu-jitsu" }];

vi.mock("@/hooks/useInstructors", () => ({
  useInstructors: () => ({ data: instructors }),
}));

vi.mock("@/hooks/useModules", () => ({
  useModules: () => ({ data: modules, isSuccess: true }),
  moduleNames: (list: { name: string }[]) => list.map((m) => m.name),
  modalityOfModule: () => "jiu-jitsu",
  DEFAULT_MODALITY: "jiu-jitsu",
}));

function setField(selector: string, value: string) {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`campo ausente: ${selector}`);
  fireEvent.change(el, { target: { value } });
}

// O Studio esconde o campo de instrutor: ele ficava vazio, a validação reprovava
// e o botão "Adicionar" parecia não fazer nada.
describe("VideoFormModal no Studio (hideInstructor)", () => {
  it("envia o formulário com o campo de instrutor escondido", async () => {
    const onSubmit = vi.fn();
    render(<VideoFormModal open onOpenChange={() => {}} onSubmit={onSubmit} hideInstructor />);

    setField('input[name="title"]', "Guarda fechada");
    setField('textarea[name="description"]', "Descrição com tamanho suficiente.");
    setField('input[name="thumbnail"]', "https://exemplo.com/capa.png");
    setField('input[name="duration"]', "12:30");

    fireEvent.click(document.querySelector('button[type="submit"]') as HTMLButtonElement);

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: "Guarda fechada", subcategory: "Defesas" });
  });
});
