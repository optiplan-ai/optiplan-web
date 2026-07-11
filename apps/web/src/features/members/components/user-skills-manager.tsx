"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserSkillFormData } from "../types";
import { useGetUserSkills } from "../api/use-get-user-skills";
import { useUpdateUserSkills } from "../api/use-update-user-skills";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface UserSkillsManagerProps {
  memberId: string;
  memberName: string;
}

const SKILL_CATEGORIES = [
  "Frontend",
  "Backend",
  "Database",
  "Cloud",
  "Design",
  "Management",
  "DevOps",
  "Mobile",
  "Testing",
  "Other",
];

export const UserSkillsManager = ({
  memberId,
  memberName,
}: UserSkillsManagerProps) => {
  const { data, isLoading } = useGetUserSkills(memberId);
  const { mutate, isPending } = useUpdateUserSkills(memberId);
  const [isOpen, setIsOpen] = useState(false);
  const [skills, setSkills] = useState<UserSkillFormData[]>([]);

  const initializeSkills = () => {
    if (data?.documents) {
      setSkills(
        data.documents.map((doc) => ({
          name: doc.name,
          category: doc.category,
          experience_years: (doc as any).experience_years ?? (doc as any).experienceYears ?? 0,
          proficiency_score: (doc as any).proficiency_score ?? (doc as any).proficiencyScore ?? 0,
        }))
      );
    } else {
      setSkills([]);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open) {
      initializeSkills();
    }
  };

  const addSkill = () => {
    setSkills([
      ...skills,
      {
        name: "",
        category: "Other",
        experience_years: 0,
        proficiency_score: 50,
      },
    ]);
  };

  const removeSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const updateSkill = (index: number, field: keyof UserSkillFormData, value: any) => {
    const updated = [...skills];
    updated[index] = { ...updated[index], [field]: value };
    setSkills(updated);
  };

  const handleSave = () => {
    const validSkills = skills.filter(
      (skill) => skill.name.trim() !== ""
    );
    if (validSkills.length === 0) {
      toast.error("Please add at least one skill");
      return;
    }
    mutate(validSkills.map((skill) => ({
      name: skill.name,
      category: skill.category,
      experienceYears: skill.experience_years,
      proficiencyScore: skill.proficiency_score,
    })), {
      onSuccess: () => {
        setIsOpen(false);
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Manage Skills
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Skills for {memberName}</DialogTitle>
          <DialogDescription>
            Add or update skills to help AI match tasks to team members.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {skills.map((skill, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-2 items-end p-4 border rounded-lg"
            >
              <div className="col-span-4">
                <Label>Skill Name</Label>
                <Input
                  value={skill.name}
                  onChange={(e) =>
                    updateSkill(index, "name", e.target.value)
                  }
                  placeholder="e.g., React, Python"
                />
              </div>
              <div className="col-span-3">
                <Label>Category</Label>
                <Select
                  value={skill.category}
                  onValueChange={(value) =>
                    updateSkill(index, "category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label>Experience (years)</Label>
                <Input
                  type="number"
                  min="0"
                  max="50"
                  value={skill.experience_years}
                  onChange={(e) =>
                    updateSkill(
                      index,
                      "experience_years",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-span-2">
                <Label>Proficiency (0-100)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={skill.proficiency_score}
                  onChange={(e) =>
                    updateSkill(
                      index,
                      "proficiency_score",
                      parseFloat(e.target.value) || 0
                    )
                  }
                />
              </div>
              <div className="col-span-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeSkill(index)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={addSkill}
            className="w-full"
          >
            <Plus className="size-4 mr-2" />
            Add Skill
          </Button>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending || isLoading}>
            Save Skills
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

