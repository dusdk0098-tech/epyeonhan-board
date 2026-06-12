Unicode true
RequestExecutionLevel user
SilentInstall silent
AutoCloseWindow true
ShowInstDetails nevershow

!include FileFunc.nsh

!ifndef FULL_INSTALLER
  !error "FULL_INSTALLER is required"
!endif

!ifndef BRIDGE_OUTFILE
  !error "BRIDGE_OUTFILE is required"
!endif

Name "PEDIT Update"
OutFile "${BRIDGE_OUTFILE}"

!ifdef BRIDGE_ICON
  Icon "${BRIDGE_ICON}"
!endif

Section
  InitPluginsDir
  SetOutPath "$PLUGINSDIR"
  File "/oname=$PLUGINSDIR\PEDIT-full-setup.exe" "${FULL_INSTALLER}"

  ${GetParameters} $R0
  ExecShellWait "runas" "$PLUGINSDIR\PEDIT-full-setup.exe" "$R0" SW_SHOWNORMAL
  Pop $0
  SetErrorLevel $0
SectionEnd
