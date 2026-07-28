-- Add DELETE policy for profiles: only admins can delete other users
CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.permissions @> '["ALL"]'::jsonb
    )
  );
