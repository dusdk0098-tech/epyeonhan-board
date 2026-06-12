!macro customInit
  ${if} ${isUpdated}
    SetSilent silent
  ${endif}
!macroend

!macro customInstall
  ${if} ${isUpdated}
    ${ifNot} ${FileExists} "$newDesktopLink"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${endif}

    ${ifNot} ${FileExists} "$newStartMenuLink"
      !insertmacro createMenuDirectory
      CreateShortCut "$newStartMenuLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
      ClearErrors
      WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
    ${endif}

    ${if} ${Silent}
      HideWindow
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "--updated"
    ${endif}
  ${endif}
!macroend
